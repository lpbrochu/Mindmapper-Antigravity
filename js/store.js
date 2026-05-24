import {
    CanvasPoint,
    MindMapDocument,
    MindMapNode,
    MindMapEdge,
    NodeColor,
    NodeColorList
} from './models.js';

export class MindMapStore {
    constructor() {
        this.document = MindMapDocument.createEmpty();
        this.selectedNodeID = this.document.nodes.find(n => n.isRoot)?.id || this.document.nodes[0]?.id;
        this.currentFileName = null;
        this.statusMessage = 'Ready';
        this.dragPreview = null;
        this.zoomScale = 1.0;
        this.centerContentRequestID = 1;
        this.listeners = [];

        this.horizontalSpacing = 330.0;
        this.verticalSpacing = 150.0;
        
        // Auto-save backup restoration if available
        this.restoreBackup();
    }

    // --- Subscription System ---

    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    notify() {
        for (const listener of this.listeners) {
            listener();
        }
    }

    markChanged(message = null) {
        this.document.updatedAt = new Date();
        if (message) {
            this.statusMessage = message;
        }
        this.saveBackup();
        this.notify();
    }

    // --- Getters ---

    get selectedNode() {
        if (!this.selectedNodeID) return null;
        return this.document.nodes.find(n => n.id === this.selectedNodeID) || null;
    }

    get canDeleteSelection() {
        const node = this.selectedNode;
        return node ? !node.isRoot : false;
    }

    get zoomPercent() {
        return Math.round(this.zoomScale * 100);
    }

    get fileDisplayName() {
        return this.currentFileName || 'Unsaved mind map';
    }

    // --- Core Operations ---

    newDocument() {
        this.document = MindMapDocument.createEmpty();
        this.selectedNodeID = this.document.nodes[0]?.id;
        this.currentFileName = null;
        this.statusMessage = 'Created a new mind map';
        this.zoomScale = 1.0;
        this.requestCenterOnContent();
        this.markChanged();
    }

    addChildToSelection() {
        const parent = this.selectedNode;
        if (!parent) return;

        const childPosition = this.nextChildPosition(parent);
        const child = new MindMapNode({
            title: 'New Idea',
            notes: '',
            color: this.nextColor(parent.color),
            position: childPosition,
            isRoot: false
        });

        this.document.nodes.push(child);
        this.document.edges.push(new MindMapEdge({
            parentID: parent.id,
            childID: child.id
        }));

        this.selectedNodeID = child.id;
        this.tidyLayout(false);
        this.markChanged('Added a child node');
    }

    addSiblingToSelection() {
        const selectedID = this.selectedNodeID;
        if (!selectedID) return;

        const parentEdge = this.document.edges.find(e => e.childID === selectedID);
        if (!parentEdge) {
            this.addChildToSelection();
            return;
        }

        this.selectedNodeID = parentEdge.parentID;
        this.addChildToSelection();
    }

    deleteSelection() {
        if (!this.canDeleteSelection || !this.selectedNodeID) return;

        const selectedID = this.selectedNodeID;
        const descendants = this.descendantIDs(selectedID);
        const idsToDelete = new Set([...descendants, selectedID]);
        const parentEdge = this.document.edges.find(e => e.childID === selectedID);
        const parentID = parentEdge ? parentEdge.parentID : null;

        this.document.nodes = this.document.nodes.filter(n => !idsToDelete.has(n.id));
        this.document.edges = this.document.edges.filter(e => !idsToDelete.has(e.parentID) && !idsToDelete.has(e.childID));

        this.selectedNodeID = parentID || this.document.nodes[0]?.id || null;
        this.tidyLayout(false);
        this.markChanged('Deleted selected branch');
    }

    moveSelectedBy(x, y) {
        const node = this.selectedNode;
        if (!node) return;

        node.position.x += x;
        node.position.y += y;
        this.markChanged();
    }

    // --- Layout Reflow Engine (Swift Dendrogram port) ---

    tidyLayout(announce = true) {
        const rootNode = this.document.nodes.find(n => n.isRoot) || this.document.nodes[0];
        if (!rootNode) return;

        const rootID = rootNode.id;
        const rootX = rootNode.position.x;
        let nextY = 180.0;

        this.layoutSubtree(rootID, 0, rootX, { y: nextY });

        if (announce) {
            this.markChanged('Tidied the layout');
        }
    }

    layoutSubtree(nodeID, depth, rootX, nextYObj) {
        const children = this.childIDs(nodeID);
        let centerY;

        if (children.length === 0) {
            centerY = nextYObj.y;
            nextYObj.y += this.verticalSpacing;
        } else {
            const childCenters = children.map(childID => {
                return this.layoutSubtree(childID, depth + 1, rootX, nextYObj);
            });
            centerY = (childCenters[0] + childCenters[childCenters.length - 1]) / 2;
        }

        const node = this.document.nodes.find(n => n.id === nodeID);
        if (node) {
            node.position.x = rootX + depth * this.horizontalSpacing;
            node.position.y = centerY;
        }

        return centerY;
    }

    childIDs(nodeID) {
        const nodeMap = new Map(this.document.nodes.map(n => [n.id, n]));
        
        return this.document.edges
            .filter(e => e.parentID === nodeID)
            .map(e => {
                const node = nodeMap.get(e.childID);
                return node ? { id: e.childID, x: node.position.x, y: node.position.y } : null;
            })
            .filter(n => n !== null)
            .sort((a, b) => {
                if (a.y === b.y) {
                    return a.x - b.x;
                }
                return a.y - b.y;
            })
            .map(n => n.id);
    }

    // --- Zoom Management ---

    zoomIn() {
        this.setZoomAndCenter(this.zoomScale * 1.18);
    }

    zoomOut() {
        this.setZoomAndCenter(this.zoomScale / 1.18);
    }

    resetZoom() {
        this.setZoomAndCenter(1.0);
    }

    setZoom(scale) {
        this.zoomScale = Math.min(Math.max(scale, 0.35), 2.5);
    }

    setZoomAndCenter(scale) {
        this.setZoom(scale);
        this.requestCenterOnContent();
    }

    requestCenterOnContent() {
        this.centerContentRequestID += 1;
        this.notify();
    }

    // --- Branch Drag and Reparent Engine ---

    branchPositions(nodeID) {
        const branchIDs = new Set([...this.descendantIDs(nodeID), nodeID]);
        const positions = {};
        for (const node of this.document.nodes) {
            if (branchIDs.has(node.id)) {
                positions[node.id] = new CanvasPoint(node.position.x, node.position.y);
            }
        }
        return positions;
    }

    moveBranch(nodeID, originalPositions, translation) {
        for (const id in originalPositions) {
            const node = this.document.nodes.find(n => n.id === id);
            if (!node) continue;

            const orig = originalPositions[id];
            node.position.x = orig.x + translation.width;
            node.position.y = orig.y + translation.height;
        }

        this.updateDragPreview(nodeID);
        this.notify(); // Dynamic update during drag
    }

    finishBranchDrag(nodeID) {
        const draggedNode = this.document.nodes.find(n => n.id === nodeID);
        if (!draggedNode) {
            this.dragPreview = null;
            this.notify();
            return;
        }

        this.selectedNodeID = nodeID;

        if (draggedNode.isRoot) {
            this.dragPreview = null;
            this.tidyLayout(false);
            this.markChanged('Moved the central branch');
            return;
        }

        const excludedIDs = new Set([...this.descendantIDs(nodeID), nodeID]);
        const targetParentID = this.reparentTarget(draggedNode, excludedIDs) ||
            this.document.nodes.find(n => n.isRoot)?.id;

        this.dragPreview = null;

        const currentParent = this.currentParentID(nodeID);
        if (!targetParentID || targetParentID === currentParent) {
            this.tidyLayout(false);
            this.markChanged('Reflowed branch');
            return;
        }

        // Relink edge
        const edgeIndex = this.document.edges.findIndex(e => e.childID === nodeID);
        if (edgeIndex !== -1) {
            this.document.edges[edgeIndex] = new MindMapEdge({
                id: this.document.edges[edgeIndex].id,
                parentID: targetParentID,
                childID: nodeID
            });
        } else {
            this.document.edges.push(new MindMapEdge({
                parentID: targetParentID,
                childID: nodeID
            }));
        }

        this.tidyLayout(false);
        this.markChanged('Reattached branch');
    }

    currentParentID(nodeID) {
        return this.document.edges.find(e => e.childID === nodeID)?.parentID || null;
    }

    updateDragPreview(draggedNodeID) {
        if (!draggedNodeID) {
            this.dragPreview = null;
            return;
        }

        const draggedNode = this.document.nodes.find(n => n.id === draggedNodeID);
        if (!draggedNode || draggedNode.isRoot) {
            this.dragPreview = null;
            return;
        }

        const excludedIDs = new Set([...this.descendantIDs(draggedNodeID), draggedNodeID]);
        const targetParentID = this.reparentTarget(draggedNode, excludedIDs) ||
            this.document.nodes.find(n => n.isRoot)?.id;

        if (!targetParentID) {
            this.dragPreview = null;
            return;
        }

        const targetNode = this.document.nodes.find(n => n.id === targetParentID);
        this.dragPreview = {
            draggedNodeID,
            targetParentID,
            from: targetNode ? new CanvasPoint(targetNode.position.x, targetNode.position.y) : new CanvasPoint(draggedNode.position.x, draggedNode.position.y),
            to: new CanvasPoint(draggedNode.position.x, draggedNode.position.y)
        };
    }

    reparentTarget(draggedNode, excludedIDs) {
        const dropPoint = draggedNode.position;
        const candidates = this.document.nodes.filter(n => !excludedIDs.has(n.id));

        // 1. Check if contained inside displayRect extended inset (-52, -40)
        // extended inset is matching x - 52 / y - 40 pad boundaries
        const containingNode = candidates.filter(n => {
            const rect = n.displayRect;
            const extendedRect = {
                x: rect.x - 52,
                y: rect.y - 40,
                width: rect.width + 104,
                height: rect.height + 80
            };
            return (
                dropPoint.x >= extendedRect.x &&
                dropPoint.x <= extendedRect.x + extendedRect.width &&
                dropPoint.y >= extendedRect.y &&
                dropPoint.y <= extendedRect.y + extendedRect.height
            );
        }).sort((a, b) => {
            return this.distanceSquared(dropPoint, a.position) - this.distanceSquared(dropPoint, b.position);
        })[0];

        if (containingNode) {
            return containingNode.id;
        }

        // 2. Otherwise find the closest node within 240px
        const closestNode = candidates.filter(n => {
            return this.distanceSquared(dropPoint, n.position) < 240 * 240;
        }).sort((a, b) => {
            return this.distanceSquared(dropPoint, a.position) - this.distanceSquared(dropPoint, b.position);
        })[0];

        return closestNode ? closestNode.id : null;
    }

    distanceSquared(lhs, rhs) {
        const dx = lhs.x - rhs.x;
        const dy = lhs.y - rhs.y;
        return dx * dx + dy * dy;
    }

    descendantIDs(nodeID) {
        const directChildren = this.document.edges
            .filter(e => e.parentID === nodeID)
            .map(e => e.childID);

        const set = new Set(directChildren);
        for (const childID of directChildren) {
            const descendants = this.descendantIDs(childID);
            for (const d of descendants) {
                set.add(d);
            }
        }
        return set;
    }

    // --- Helpers ---

    nextChildPosition(parent) {
        const siblingCount = this.document.edges.filter(e => e.parentID === parent.id).length;
        const offset = siblingCount * this.verticalSpacing;

        return new CanvasPoint(
            parent.position.x + this.horizontalSpacing,
            parent.position.y + offset
        );
    }

    nextColor(color) {
        const keys = Object.keys(NodeColor);
        const index = keys.indexOf(color);
        if (index === -1) return 'blue';
        return keys[(index + 1) % keys.length];
    }

    // --- Import and Export System ---

    // JSON file load
    loadDocumentFromJSON(jsonText, fileName = null) {
        try {
            const raw = JSON.parse(jsonText);
            
            // Standard validation / parsing
            this.document = new MindMapDocument({
                title: raw.title || 'Untitled Mind Map',
                nodes: raw.nodes || [],
                edges: raw.edges || [],
                updatedAt: raw.updatedAt || new Date()
            });

            this.selectedNodeID = this.document.nodes.find(n => n.isRoot)?.id || this.document.nodes[0]?.id || null;
            this.currentFileName = fileName;
            this.statusMessage = fileName ? `Opened ${fileName}` : 'Loaded mind map';
            this.requestCenterOnContent();
            this.markChanged();
        } catch (e) {
            this.statusMessage = `Error parsing JSON: ${e.message}`;
            this.notify();
        }
    }

    // Export to JSON string
    exportDocumentToJSON() {
        this.document.updatedAt = new Date();
        return JSON.stringify(this.document, null, 2);
    }

    // Markdown Exporter
    exportDocumentToMarkdown() {
        const root = this.document.nodes.find(n => n.isRoot) || this.document.nodes[0];
        if (!root) {
            return `# ${this.document.title}\n`;
        }

        const lines = [`# ${this.document.title}`, ''];
        this.appendMarkdownNode(root.id, 0, lines);
        return lines.join('\n') + '\n';
    }

    appendMarkdownNode(nodeID, depth, lines) {
        const node = this.document.nodes.find(n => n.id === nodeID);
        if (!node) return;

        const indent = '  '.repeat(depth);
        const title = node.title || 'Untitled';
        lines.push(`${indent}- ${title}`);

        if (node.notes && node.notes.trim() !== '') {
            const noteLines = node.notes
                .split('\n')
                .map(l => l.trim())
                .filter(l => l !== '');
            for (const line of noteLines) {
                lines.push(`${indent}  > ${line}`);
            }
        }

        const children = this.childIDs(nodeID);
        for (const childID of children) {
            this.appendMarkdownNode(childID, depth + 1, lines);
        }
    }

    // Markdown Importer
    importDocumentFromMarkdown(markdownText, sourceName = null) {
        let title = sourceName ? sourceName.replace(/\.[^/.]+$/, "") : 'Imported Mind Map';
        const nodes = [];
        const edges = [];
        const stack = [];
        let lastNodeID = null;

        const lines = markdownText.split(/\r?\n/);

        for (const rawLine of lines) {
            const trimmed = rawLine.trim();
            if (trimmed === '') continue;

            if (trimmed.startsWith('# ')) {
                title = trimmed.substring(2).trim();
                continue;
            }

            if (trimmed.startsWith('> ') && lastNodeID) {
                this.appendNoteToNodeList(trimmed.substring(2).trim(), lastNodeID, nodes);
                continue;
            }

            const bullet = this.parseMarkdownBullet(rawLine);
            if (!bullet) {
                // If it is just unformatted line inside list, threat as note
                if (lastNodeID) {
                    this.appendNoteToNodeList(trimmed, lastNodeID, nodes);
                }
                continue;
            }

            const isRoot = nodes.length === 0;
            const node = new MindMapNode({
                title: bullet.title === '' ? 'Untitled' : bullet.title,
                notes: '',
                color: isRoot ? 'teal' : NodeColorList[nodes.length % NodeColorList.length].id,
                position: new CanvasPoint(900, 560),
                isRoot: isRoot
            });
            
            nodes.push(node);

            while (stack.length > 0 && stack[stack.length - 1].level >= bullet.level) {
                stack.pop();
            }

            if (stack.length > 0) {
                const parent = stack[stack.length - 1];
                edges.push(new MindMapEdge({
                    parentID: parent.id,
                    childID: node.id
                }));
            }

            stack.push({ level: bullet.level, id: node.id });
            lastNodeID = node.id;
        }

        if (nodes.length === 0) {
            nodes.push(new MindMapNode({
                title: title,
                notes: '',
                color: 'teal',
                position: new CanvasPoint(900, 560),
                isRoot: true
            }));
        }

        // Guarantee first node is root
        nodes[0].isRoot = true;

        this.document = new MindMapDocument({
            title: title,
            nodes: nodes,
            edges: edges,
            updatedAt: new Date()
        });

        this.selectedNodeID = this.document.nodes[0]?.id;
        this.currentFileName = null; // resets local file reference
        this.tidyLayout(false);
        this.statusMessage = sourceName ? `Imported ${sourceName}` : 'Imported Markdown';
        this.requestCenterOnContent();
        this.markChanged();
    }

    parseMarkdownBullet(line) {
        // Count leading spaces
        const leadingSpaces = line.search(/\S/);
        const trimmed = line.trim();

        const markers = ['- ', '* ', '+ '];
        for (const marker of markers) {
            if (trimmed.startsWith(marker)) {
                const title = trimmed.substring(marker.length).trim();
                const level = Math.floor(leadingSpaces / 2);
                return { level, title };
            }
        }

        return null;
    }

    appendNoteToNodeList(noteText, nodeID, nodes) {
        const node = nodes.find(n => n.id === nodeID);
        if (!node) return;

        if (!node.notes || node.notes.trim() === '') {
            node.notes = noteText;
        } else {
            node.notes += '\n' + noteText;
        }
    }

    // --- Backup & LocalStorage Auto-Save ---

    saveBackup() {
        try {
            const data = {
                title: this.document.title,
                nodes: this.document.nodes,
                edges: this.document.edges,
                selectedNodeID: this.selectedNodeID,
                currentFileName: this.currentFileName,
                zoomScale: this.zoomScale
            };
            localStorage.setItem('mindmapper_autosave', JSON.stringify(data));
        } catch (e) {
            // Ignore if localStorage is blocked
        }
    }

    restoreBackup() {
        try {
            const backupText = localStorage.getItem('mindmapper_autosave');
            if (backupText) {
                const data = JSON.parse(backupText);
                if (data && data.nodes && data.nodes.length > 0) {
                    this.document = new MindMapDocument({
                        title: data.title || 'Untitled Mind Map',
                        nodes: data.nodes,
                        edges: data.edges || [],
                        updatedAt: new Date()
                    });
                    this.selectedNodeID = data.selectedNodeID || this.document.nodes[0]?.id;
                    this.currentFileName = data.currentFileName || null;
                    this.zoomScale = data.zoomScale || 1.0;
                    this.statusMessage = 'Restored auto-saved workspace';
                }
            }
        } catch (e) {
            // Ignore recovery errors
        }
    }

    clearBackup() {
        try {
            localStorage.removeItem('mindmapper_autosave');
        } catch (e) {
            // Ignore
        }
    }
}
