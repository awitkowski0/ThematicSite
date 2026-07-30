// The drag-and-drop tier board. Presentation only — persistence, URL sharing, and scope/filter
// controls live in the /tierlist route; this component just renders `state` and reports moves.
import { useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useDraggable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import { Suit, getSuit } from '../lib/suits'
import { TIERS, TierListState, visibleTier } from '../lib/tierlist'
import { SuitThumb } from './controls'

function TileBody({ suit, shiny, dragging, onToggleShiny }: { suit: Suit; shiny: boolean; dragging?: boolean; onToggleShiny: (id: string) => void }) {
  return (
    <div
      className={`flex w-40 items-center gap-2 rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-sm dark:border-neutral-800 dark:bg-neutral-950 ${
        dragging ? 'opacity-40' : ''
      }`}
    >
      <SuitThumb suit={suit} shiny={shiny} />
      <span className="min-w-0 flex-1 truncate">{suit.name}</span>
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          onToggleShiny(suit.id)
        }}
        title="Toggle shiny display"
        className={`shrink-0 rounded px-1 py-0.5 text-xs ${
          shiny ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300' : 'text-neutral-300 hover:text-neutral-500 dark:hover:text-neutral-400'
        }`}
      >
        ✨
      </button>
    </div>
  )
}

/** Draggable-only tile for the unassigned pool — not sortable, so a ~500-item pool doesn't pay for reflow it doesn't need. */
function PoolTile({ suit, shiny, onToggleShiny }: { suit: Suit; shiny: boolean; onToggleShiny: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: suit.id })
  return (
    <div ref={setNodeRef} {...attributes} {...listeners}>
      <TileBody suit={suit} shiny={shiny} dragging={isDragging} onToggleShiny={onToggleShiny} />
    </div>
  )
}

/** Sortable tile used inside a tier row, so reordering within a tier animates live. */
function TierTile({ suit, shiny, onToggleShiny }: { suit: Suit; shiny: boolean; onToggleShiny: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: suit.id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TileBody suit={suit} shiny={shiny} dragging={isDragging} onToggleShiny={onToggleShiny} />
    </div>
  )
}

function TierRow({
  tierId,
  label,
  barClass,
  suits,
  shinies,
  onToggleShiny,
}: {
  tierId: string
  label: string
  barClass: string
  suits: Suit[]
  shinies: Record<string, true>
  onToggleShiny: (id: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: tierId })
  return (
    <div className="flex gap-3 border-b border-neutral-200 py-3 last:border-b-0 dark:border-neutral-800">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-md text-lg font-bold text-white ${barClass}`}>{label}</div>
      <SortableContext items={suits.map((s) => s.id)} strategy={rectSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`flex min-h-[3.5rem] flex-1 flex-wrap items-start gap-2 rounded-md p-2 ${
            isOver ? 'bg-blue-50 dark:bg-blue-950/30' : ''
          }`}
        >
          {suits.length === 0 && <span className="self-center text-xs text-neutral-400">Drop suits here</span>}
          {suits.map((s) => (
            <TierTile key={s.id} suit={s} shiny={Boolean(shinies[s.id])} onToggleShiny={onToggleShiny} />
          ))}
        </div>
      </SortableContext>
    </div>
  )
}

function Pool({
  suits,
  emptyMessage,
  shinies,
  onToggleShiny,
}: {
  suits: Suit[]
  emptyMessage: string
  shinies: Record<string, true>
  onToggleShiny: (id: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: 'pool' })
  return (
    <div
      ref={setNodeRef}
      className={`mt-2 flex max-h-96 flex-wrap items-start gap-2 overflow-y-auto rounded-md border border-dashed p-3 ${
        isOver ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/30' : 'border-neutral-300 dark:border-neutral-700'
      }`}
    >
      {suits.length === 0 && <span className="text-xs text-neutral-400">{emptyMessage}</span>}
      {suits.map((s) => (
        <PoolTile key={s.id} suit={s} shiny={Boolean(shinies[s.id])} onToggleShiny={onToggleShiny} />
      ))}
    </div>
  )
}

export function TierBoardSkeleton() {
  return (
    <div className="mt-4 animate-pulse">
      {TIERS.map((t) => (
        <div key={t.id} className="flex gap-3 border-b border-neutral-200 py-3 last:border-b-0 dark:border-neutral-800">
          <div className={`h-12 w-12 shrink-0 rounded-md ${t.barClass} opacity-50`} />
          <div className="min-h-[3.5rem] flex-1 rounded-md bg-neutral-100 dark:bg-neutral-900" />
        </div>
      ))}
      <div className="mt-2 h-24 rounded-md border border-dashed border-neutral-300 dark:border-neutral-700" />
    </div>
  )
}

export function TierBoard({
  state,
  pool,
  poolEmptyMessage,
  onMove,
  onToggleShiny,
}: {
  state: TierListState
  pool: Suit[]
  poolEmptyMessage: string
  onMove: (suitId: string, dest: string, index?: number) => void
  onToggleShiny: (suitId: string) => void
}) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragStart = (event: DragStartEvent) => setActiveId(String(event.active.id))

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = event
    if (!over) return
    const suitId = String(active.id)
    const overId = String(over.id)
    if (suitId === overId) return

    if (overId === 'pool') {
      onMove(suitId, 'pool')
      return
    }

    const tierIds = TIERS.map((t) => t.id)
    if (tierIds.includes(overId)) {
      onMove(suitId, overId)
      return
    }

    // overId is another suit's id — resolve which tier it's in (if any) and insert next to it.
    const destTier = state.tiers.findIndex((ids) => ids.includes(overId))
    if (destTier === -1) {
      onMove(suitId, 'pool') // dropped near a pool suit
      return
    }
    const withoutSuit = state.tiers[destTier].filter((id) => id !== suitId)
    const index = withoutSuit.indexOf(overId)
    onMove(suitId, TIERS[destTier].id, index === -1 ? withoutSuit.length : index)
  }

  const activeSuit = activeId ? getSuit(activeId) : undefined

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setActiveId(null)}>
      <div className="mt-4 rounded-lg border border-neutral-200 dark:border-neutral-800">
        {TIERS.map((tier, i) => (
          <TierRow
            key={tier.id}
            tierId={tier.id}
            label={tier.label}
            barClass={tier.barClass}
            suits={visibleTier(state, i)}
            shinies={state.shinies}
            onToggleShiny={onToggleShiny}
          />
        ))}
      </div>

      <h2 className="mt-6 text-lg font-semibold">Unassigned</h2>
      <Pool suits={pool} emptyMessage={poolEmptyMessage} shinies={state.shinies} onToggleShiny={onToggleShiny} />

      <DragOverlay>{activeSuit && <TileBody suit={activeSuit} shiny={Boolean(state.shinies[activeSuit.id])} onToggleShiny={() => {}} />}</DragOverlay>
    </DndContext>
  )
}
