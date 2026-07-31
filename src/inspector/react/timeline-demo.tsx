import { createTimelineCore } from '../timeline/core/index.js';
import type { TimelineConfig } from '../timeline/core/types.js';

export function InspectorExample() {
  const [descriptor, setDescriptor] = useState<TimelineConfig>({
    marks: [
      { id: 'start', time: 0, label: 'Start', color: '#ef4444' },
      { id: 'middle', time: 10, label: 'Middle', color: '#3b82f6' },
      { id: 'end', time: 20, label: 'End', color: '#10b981' },
    ],
    range: { start: 0, end: 20, label: 'Session', data: {} },
    position: 5,
    rate: 1.0,
    playing: false,
    loop: false,
  });

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui' }}>
      <h2>Timeline Inspector Example</h2>
      <p>Use this inspector to test and explore the Timeline component with different configurations.</p>

      <div style={{ marginBottom: '20px' }}>
        <h3>Configuration</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '10px', alignItems: 'center' }}>
          <label>Position:</label>
          <input
            type="range"
            min="0"
            max="20"
            value={descriptor.position}
            onChange={(e) => setDescriptor({ ...descriptor, position: Number(e.target.value) })}
            style={{ padding: '8px' }}
          />

          <label>Rate:</label>
          <input
            type="range"
            min="0.1"
            max="2"
            step="0.1"
            value={descriptor.rate}
            onChange={(e) => setDescriptor({ ...descriptor, rate: Number(e.target.value) })}
            style={{ padding: '8px' }}
          />

          <label>Playing:</label>
          <input
            type="checkbox"
            checked={descriptor.playing}
            onChange={(e) => setDescriptor({ ...descriptor, playing: e.target.checked })}
          />

          <label>Loop:</label>
          <input
            type="checkbox"
            checked={descriptor.loop}
            onChange={(e) => setDescriptor({ ...descriptor, loop: e.target.checked })}
          />
        </div>
      </div>

      <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '20px', backgroundColor: '#f9f9f9' }}>
        <h3>Rendered Component</h3>
        <Inspector
          componentType="timeline"
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