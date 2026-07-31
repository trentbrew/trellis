import { createPaletteCore } from '../palette/core/index.js';
import type { PaletteConfig } from '../palette/core/types.js';

export function InspectorExample() {
  const [descriptor, setDescriptor] = useState<PaletteConfig>({
    items: [
      { id: 'task-1', label: 'Open Task', keywords: ['task', 'open'], group: 'Graph' },
      { id: 'task-2', label: 'New Note', group: 'Graph' },
      { id: 'task-3', label: 'Sync with peers', keywords: ['realtime', 'sync'], group: 'Network' },
      { id: 'task-4', label: 'Quit', group: 'System' },
    ],
  });

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui' }}>
      <h2>Palette Inspector Example</h2>
      <p>Use this inspector to test and explore the Palette component with different configurations.</p>

      <div style={{ marginBottom: '20px' }}>
        <h3>Configuration</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '10px', alignItems: 'center' }}>
          <label>Query:</label>
          <input
            type="text"
            placeholder="Search..."
            style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
          />

          <label>Items:</label>
          <textarea
            value={JSON.stringify(descriptor.items, null, 2)}
            onChange={(e) => {
              try {
                setDescriptor({ ...descriptor, items: JSON.parse(e.target.value) });
              } catch (error) {
                console.error('Invalid JSON:', error);
              }
            }}
            style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontFamily: 'monospace', fontSize: '12px' }}
          />

          <label>Close on select:</label>
          <input type="checkbox" defaultChecked />

          <label>Wrap selection:</label>
          <input type="checkbox" defaultChecked />
        </div>
      </div>

      <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '20px', backgroundColor: '#f9f9f9' }}>
        <h3>Rendered Component</h3>
        <Inspector
          componentType="palette"
          descriptor={descriptor}
          framework="react"
          height="300px"
          showControls={false}
        />
      </div>

      <div style={{ marginTop: '20px' }}>
        <h3>Component State</h3>
        <pre style={{ backgroundColor: '#f5f5f5', padding: '10px', borderRadius: '4px', overflow: 'auto' }}>
          {JSON.stringify(descriptor, null, 2)}
        </pre>
      </div>
    </div>
  );
}