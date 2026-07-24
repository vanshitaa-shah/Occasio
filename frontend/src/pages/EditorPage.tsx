import { CanvasRenderer } from '../components/CanvasRenderer';
import { Toolbar } from '../components/Toolbar';
import { PropertiesPanel } from '../components/PropertiesPanel';
import { ScheduleForm } from '../components/ScheduleForm';
import { useCardDesign } from '../hooks/useCardDesign';
import { useCanvasScale } from '../hooks/useCanvasScale';

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

  const { ref: canvasAreaRef, scale } = useCanvasScale(design.width, design.height);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-100 text-slate-900">
      <header className="border-b bg-white px-6 py-3">
        <h1 className="text-lg font-semibold">Occasio</h1>
        <p className="text-xs text-slate-500">
          Design a card, then schedule it to be emailed as an image.
        </p>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[220px_1fr_300px] gap-4 p-4">
        <aside className="overflow-y-auto rounded-xl bg-white p-4 shadow-sm">
          <Toolbar
            theme={design.theme}
            onThemeChange={setTheme}
            onAddShape={addShape}
          />
        </aside>

        {/* Canvas cell: fixed-size design scaled to fit, never scrolls. */}
        <main
          ref={canvasAreaRef}
          className="flex min-h-0 items-center justify-center overflow-hidden rounded-xl bg-white p-4 shadow-sm"
        >
          <div
            className="shadow-lg"
            style={{
              width: design.width * scale,
              height: design.height * scale,
              lineHeight: 0,
            }}
          >
            <CanvasRenderer
              design={design}
              scale={scale}
              interactive
              selectedId={selectedId}
              onSelect={select}
              onChangeElement={updateElement}
            />
          </div>
        </main>

        <aside className="space-y-4 overflow-y-auto">
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
