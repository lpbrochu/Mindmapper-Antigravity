/**
 * Canvas Point coordinate pair
 */
export class CanvasPoint {
    constructor(x = 0, y = 0) {
        this.x = Number(x);
        this.y = Number(y);
    }
}

/**
 * Node Colors representation matching Swift NodeColor enum
 */
export const NodeColor = {
    teal: { id: 'teal', label: 'Teal', tint: '#0f766e', border: '#14b8a6' },
    blue: { id: 'blue', label: 'Blue', tint: '#1d4ed8', border: '#3b82f6' },
    indigo: { id: 'indigo', label: 'Indigo', tint: '#4338ca', border: '#6366f1' },
    rose: { id: 'rose', label: 'Rose', tint: '#be185d', border: '#ec4899' },
    amber: { id: 'amber', label: 'Amber', tint: '#b45309', border: '#f59e0b' },
    green: { id: 'green', label: 'Green', tint: '#15803d', border: '#22c55e' },
    graphite: { id: 'graphite', label: 'Graphite', tint: '#374151', border: '#9ca3af' }
};

export const NodeColorList = Object.values(NodeColor);

/**
 * Mind Map Node model matching SwiftUI MindMapNode
 */
export class MindMapNode {
    constructor({
        id = null,
        title = 'Idea',
        notes = '',
        color = 'teal',
        position = new CanvasPoint(900, 560),
        isRoot = false
    } = {}) {
        this.id = id || crypto.randomUUID();
        this.title = title;
        this.notes = notes;
        this.color = color; // Key string like 'teal', 'blue'
        this.position = new CanvasPoint(position.x, position.y);
        this.isRoot = Boolean(isRoot);
    }

    /**
     * Compute visual size of the node card based on properties
     */
    get displaySize() {
        const width = this.isRoot ? 220 : 190;
        const height = (!this.notes || this.notes.trim() === '') ? 88 : 132;
        return { width, height };
    }

    /**
     * Compute boundary rectangle centered at current position
     */
    get displayRect() {
        const { width, height } = this.displaySize;
        return {
            x: this.position.x - width / 2,
            y: this.position.y - height / 2,
            width,
            height
        };
    }
}

/**
 * Mind Map Edge model matching SwiftUI MindMapEdge
 */
export class MindMapEdge {
    constructor({ id = null, parentID, childID }) {
        this.id = id || crypto.randomUUID();
        this.parentID = parentID;
        this.childID = childID;
    }
}

/**
 * Mind Map Document representation
 */
export class MindMapDocument {
    constructor({ title = 'Untitled Mind Map', nodes = [], edges = [], updatedAt = null } = {}) {
        this.title = title;
        this.nodes = nodes.map(n => new MindMapNode(n));
        this.edges = edges.map(e => new MindMapEdge(e));
        this.updatedAt = updatedAt ? new Date(updatedAt) : new Date();
    }

    /**
     * Default empty starting document
     */
    static createEmpty() {
        return new MindMapDocument({
            title: 'Untitled Mind Map',
            nodes: [
                new MindMapNode({
                    title: 'Central Idea',
                    notes: 'Start here, then add branches for the ideas around it.',
                    color: 'teal',
                    position: new CanvasPoint(900, 560),
                    isRoot: true
                })
            ],
            edges: [],
            updatedAt: new Date()
        });
    }
}
