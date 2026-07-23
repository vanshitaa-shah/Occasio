import { CanvasRenderer } from '../components/CanvasRenderer';
import { Toolbar } from '../components/Toolbar';
import { PropertiesPanel } from '../components/PropertiesPanel';
import { ScheduleForm } from '../components/ScheduleForm';
import { useCardDesign } from '../hooks/useCardDesign';

export function EditorPage() {
  const {
    design,
    selectedId,
    selection,
    select,
    setTheme,
    addShape,
    updateElement,
    deleteSelected,
  } = useCardDesign();

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b bg-white px-6 py-3">
        <h1 className="text-lg font-semibold">Occasio</h1>
        <p className="text-xs text-slate-500">
          Design a card, then schedule it to be emailed as an image.
        </p>
      </header>

      <div className="mx-auto grid max-w-[1400px] grid-cols-[220px_1fr_300px] gap-4 p-4">
        <aside className="rounded-xl bg-white p-4 shadow-sm">
          <Toolbar
            theme={design.theme}
            onThemeChange={setTheme}
            onAddShape={addShape}
          />
        </aside>

        <main className="flex items-start justify-center overflow-auto rounded-xl bg-white p-4 shadow-sm">
          <div className="shadow-lg" style={{ lineHeight: 0 }}>
            <CanvasRenderer
              design={design}
              interactive
              selectedId={selectedId}
              onSelect={select}
              onChangeElement={updateElement}
            />
          </div>
        </main>

        <aside className="space-y-4">
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <PropertiesPanel
              selection={selection}
              onUpdate={updateElement}
              onDelete={deleteSelected}
            />
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Schedule</h2>
            <ScheduleForm design={design} />
          </div>
        </aside>
      </div>
    </div>
  );
}
