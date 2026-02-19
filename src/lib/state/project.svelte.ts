import type { VanimDocument, VanimNode, VanimParticle } from '$lib/types/vanim';

function createDefaultDocument(): VanimDocument {
  return {
    version: 1,
    name: 'untitled',
    duration: 1000,
    width: 512,
    height: 512,
    assets: {},
    nodes: [
      { id: 'root', type: 'container', children: [] },
    ],
    particles: [],
    params: {},
  };
}

class ProjectState {
  document = $state<VanimDocument>(createDefaultDocument());
  filePath = $state<string | null>(null);
  dirty = $state(false);

  get nodes(): VanimNode[] {
    return this.document.nodes;
  }

  get particles(): VanimParticle[] {
    return this.document.particles ?? [];
  }

  setDocument(doc: VanimDocument, path?: string): void {
    this.document = doc;
    this.filePath = path ?? null;
    this.dirty = false;
  }

  newDocument(): void {
    this.document = createDefaultDocument();
    this.filePath = null;
    this.dirty = false;
  }

  updateDocument(updater: (doc: VanimDocument) => VanimDocument): void {
    this.document = updater(this.document);
    this.dirty = true;
  }

  getNodeById(id: string): VanimNode | undefined {
    return this.document.nodes.find((n) => n.id === id);
  }

  addNode(node: VanimNode, parentId: string = 'root'): void {
    this.document = {
      ...this.document,
      nodes: [
        ...this.document.nodes.map((n) => {
          if (n.id === parentId && n.type === 'container') {
            return { ...n, children: [...(n.children ?? []), node.id] };
          }
          return n;
        }),
        node,
      ],
    };
    this.dirty = true;
  }

  removeNode(id: string): void {
    // Удаляем ноду и все ссылки на неё из children
    this.document = {
      ...this.document,
      nodes: this.document.nodes
        .filter((n) => n.id !== id)
        .map((n) => {
          if (n.type === 'container' && n.children) {
            return { ...n, children: n.children.filter((c) => c !== id) };
          }
          return n;
        }),
    };
    this.dirty = true;
  }

  updateNode(id: string, updater: (node: VanimNode) => VanimNode): void {
    this.document = {
      ...this.document,
      nodes: this.document.nodes.map((n) => (n.id === id ? updater(n) : n)),
    };
    this.dirty = true;
  }

  addParticle(particle: VanimParticle): void {
    this.document = {
      ...this.document,
      particles: [...(this.document.particles ?? []), particle],
    };
    this.dirty = true;
  }

  removeParticle(id: string): void {
    this.document = {
      ...this.document,
      particles: (this.document.particles ?? []).filter((p) => p.id !== id),
    };
    this.dirty = true;
  }
}

export const projectState = new ProjectState();
