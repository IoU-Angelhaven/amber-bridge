import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DndContext, DragOverlay, pointerWithin, rectIntersection, type CollisionDetection, MouseSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { ArrowRight, Check, FileText, MessageSquare, Plus, Share2 } from 'lucide-react';
import { FilterBar, useFilters } from '../components/FilterBar';
import { ProposalModal } from '../components/ProposalModal';
import { Badge, InitiativeStatusBadge, PageHeader } from '../components/ui';
import { t } from '../i18n/en';
import { fill, includesText } from '../lib/format';
import { columnOptions, columns, countryOptions, phaseName, phaseOptions, wpOptions } from '../lib/reference';
import { moveInitiative } from '../store/actions';
import { useSession } from '../store/session';
import { useDb } from '../store/store';
import { toast } from '../store/toast';
import type { Column, Db, Initiative } from '../types';

const statusOptions = (['active', 'paused', 'closed'] as const).map((s) => ({ value: s, label: t.initiativeStatus[s] }));

// A card is dropped in the column under the pointer; if the pointer is outside all columns, the nearest overlap counts.
const collision: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  return hits.length > 0 ? hits : rectIntersection(args);
};

interface CardProps {
  item: Initiative;
  db: Db;
  canEdit: boolean;
  onMove: (id: string, column: Column) => void;
  onSuggest: (item: Initiative) => void;
}

function CardBody({ item, db, canEdit, onMove, onSuggest }: CardProps) {
  const org = db.organisations.find((o) => o.id === item.orgId);
  const owner = db.people.find((p) => p.id === item.ownerId);
  const commentCount = db.comments.filter((c) => c.targetType === 'initiative' && c.targetId === item.id).length;
  const suggested = db.proposals.some((p) => p.initiativeId === item.id);
  return (
    <>
      <div className="mb-1.5 flex flex-wrap gap-1">
        <Badge tone="blue">{item.wp}</Badge>
        <Badge tone="outline">{org ? t.countries[org.country] : ''}</Badge>
        {item.status !== 'active' && <InitiativeStatusBadge status={item.status} />}
      </div>
      <h3 className="text-sm">
        <Link to={`/initiatives/${item.id}`} className="plain-link">
          {item.title}
        </Link>
      </h3>
      <p className="text-muted mt-1 text-xs">
        {org?.short} · {owner?.name}
      </p>
      <p className="text-muted text-xs">{phaseName(item.phaseId)}</p>
      {item.nextStep && (
        <p className="mt-2 flex gap-1.5 text-xs">
          <ArrowRight size={13} className="text-accent-text mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            <span className="font-semibold">{t.board.nextStep}: </span>
            {item.nextStep}
          </span>
        </p>
      )}
      <p className="text-muted mt-2 flex gap-3 text-xs">
        <span className="inline-flex items-center gap-1" title={fill(t.board.commentsCount, { n: commentCount })}>
          <MessageSquare size={13} aria-hidden="true" />
          <span className="sr-only">{fill(t.board.commentsCount, { n: commentCount })}</span>
          <span aria-hidden="true">{commentCount}</span>
        </span>
        <span className="inline-flex items-center gap-1" title={fill(t.board.docsCount, { n: item.documentIds.length })}>
          <FileText size={13} aria-hidden="true" />
          <span className="sr-only">{fill(t.board.docsCount, { n: item.documentIds.length })}</span>
          <span aria-hidden="true">{item.documentIds.length}</span>
        </span>
      </p>
      {canEdit && (
        <label className="mt-2 flex items-center gap-2 text-xs font-semibold">
          <span aria-hidden="true">{t.board.moveTo}</span>
          <select
            className="input min-h-8 flex-1 px-1.5 py-0.5 text-xs"
            aria-label={fill(t.board.moveLabel, { title: item.title })}
            value={item.column}
            onChange={(e) => onMove(item.id, e.target.value as Column)}
          >
            {columnOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      )}
      {item.column === 'spread' &&
        canEdit &&
        (suggested ? (
          <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-[#17552f]">
            <Check size={14} aria-hidden="true" />
            {t.board.suggested}
          </p>
        ) : (
          <button type="button" className="btn btn-sm mt-2 w-full" onClick={() => onSuggest(item)}>
            <Share2 size={13} aria-hidden="true" />
            {t.board.suggest}
          </button>
        ))}
    </>
  );
}

function Card(props: CardProps) {
  const { setNodeRef, listeners, isDragging } = useDraggable({ id: props.item.id, disabled: !props.canEdit });
  return (
    <li
      ref={setNodeRef}
      {...listeners}
      className={`border-line rounded border bg-white p-3 shadow-sm ${props.canEdit ? 'cursor-grab select-none' : ''} ${isDragging ? 'opacity-30' : ''}`}
    >
      <CardBody {...props} />
    </li>
  );
}

function BoardColumn({ column, items, ...rest }: { column: Column; items: Initiative[] } & Omit<CardProps, 'item'>) {
  const { setNodeRef, isOver } = useDroppable({ id: column });
  return (
    <section ref={setNodeRef} aria-labelledby={`col-${column}`} className={`flex flex-col rounded p-2.5 ${isOver ? 'bg-brand-light/40 outline-brand outline-2 outline-dashed' : 'bg-[#e6eaf2]'}`}>
      <div className="mb-2 px-1">
        <h2 id={`col-${column}`} className="text-ink flex items-center justify-between text-sm font-bold tracking-wide uppercase">
          {t.columns[column]}
          <span className="text-ink rounded-full bg-white px-2 py-0.5 text-xs" aria-label={fill(t.board.count, { n: items.length })}>
            {items.length}
          </span>
        </h2>
        <p className="mt-0.5 text-xs text-[#44525b]">{t.columnHelp[column]}</p>
      </div>
      {items.length === 0 ? (
        <p className="px-1 py-6 text-center text-xs text-[#44525b]">{t.board.emptyColumn}</p>
      ) : (
        <ul className="space-y-2.5">
          {items.map((item) => (
            <Card key={item.id} item={item} {...rest} />
          ))}
        </ul>
      )}
    </section>
  );
}

export default function Board() {
  const db = useDb();
  const session = useSession();
  const { get } = useFilters();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [suggestFor, setSuggestFor] = useState<Initiative>();
  const canEdit = session.can('initiatives.edit');
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
  );

  const country = (i: Initiative) => db.organisations.find((o) => o.id === i.orgId)?.country;
  const list = db.initiatives.filter(
    (i) =>
      (!get('wp') || i.wp === get('wp')) &&
      (!get('country') || country(i) === get('country')) &&
      (!get('phase') || String(i.phaseId) === get('phase')) &&
      (!get('status') || i.status === get('status')) &&
      (!get('q') || includesText(`${i.title} ${i.problem} ${i.hypothesis} ${i.nextStep}`, get('q'))),
  );

  const move = (id: string, column: Column) => {
    const item = db.initiatives.find((i) => i.id === id);
    if (!item || item.column === column) return;
    moveInitiative(id, column, t.columns[column], session.userId);
    toast(fill(t.board.moved, { title: item.title, column: t.columns[column] }));
  };

  const shared = { db, canEdit, onMove: move, onSuggest: setSuggestFor };
  const active = db.initiatives.find((i) => i.id === activeId);

  return (
    <>
      <PageHeader
        title={t.board.title}
        intro={t.board.intro}
        actions={
          canEdit && (
            <Link to="/initiatives/new" className="btn">
              <Plus size={16} aria-hidden="true" />
              {t.board.create}
            </Link>
          )
        }
      />
      <FilterBar
        searchLabel={t.board.searchLabel}
        shown={list.length}
        total={db.initiatives.length}
        filters={[
          { key: 'country', label: t.common.country, options: countryOptions },
          { key: 'wp', label: t.common.wp, options: wpOptions },
          { key: 'phase', label: t.common.phase, options: phaseOptions },
          { key: 'status', label: t.common.status, options: statusOptions },
        ]}
      />
      <DndContext
        sensors={sensors}
        collisionDetection={collision}
        onDragStart={(e) => setActiveId(String(e.active.id))}
        onDragCancel={() => setActiveId(null)}
        onDragEnd={(e) => {
          setActiveId(null);
          if (e.over) move(String(e.active.id), e.over.id as Column);
        }}
      >
        <div tabIndex={0} role="group" aria-label={t.board.title} className="grid grid-flow-col auto-cols-[minmax(13.5rem,1fr)] gap-3 overflow-x-auto pb-3">
          {columns.map((c) => (
            <BoardColumn key={c} column={c} items={list.filter((i) => i.column === c)} {...shared} />
          ))}
        </div>
        <DragOverlay>
          {active && (
            <div className="border-brand cursor-grabbing rounded border-2 bg-white p-3 shadow-xl">
              <CardBody item={active} {...shared} canEdit={false} />
            </div>
          )}
        </DragOverlay>
      </DndContext>
      <ProposalModal initiative={suggestFor} onClose={() => setSuggestFor(undefined)} />
    </>
  );
}
