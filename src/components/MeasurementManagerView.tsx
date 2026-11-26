import { useState } from 'react';
import { Check, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { PILLARS, type MeasurementItem, type PillarCode } from '../utils/hse5s';

interface MeasurementManagerViewProps {
  items: MeasurementItem[];
  onAddItem: (payload: { pillar: PillarCode; title: string; criteria: string }) => Promise<void>;
  onUpdateItem: (
    id: string,
    payload: { pillar: PillarCode; title: string; criteria: string },
  ) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
}

export function MeasurementManagerView({
  items,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
}: MeasurementManagerViewProps) {
  const [pillar, setPillar] = useState<PillarCode>('S1');
  const [title, setTitle] = useState('');
  const [criteria, setCriteria] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPillar, setEditPillar] = useState<PillarCode>('S1');
  const [editTitle, setEditTitle] = useState('');
  const [editCriteria, setEditCriteria] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [listMessage, setListMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(
    null,
  );

  const filteredItems = items.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.code.toLowerCase().includes(q) ||
      item.title.toLowerCase().includes(q) ||
      item.criteria.toLowerCase().includes(q) ||
      item.pillar.toLowerCase().includes(q)
    );
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (title.trim().length < 2 || criteria.trim().length < 4) {
      setError('Judul item dan kriteria penilaian wajib diisi dengan lengkap.');
      return;
    }

    setIsSaving(true);
    try {
      await onAddItem({
        pillar,
        title: title.trim(),
        criteria: criteria.trim(),
      });
      setSuccess(`Item measurement baru "${title.trim()}" berhasil ditambahkan ke ${pillar}.`);
      setTitle('');
      setCriteria('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menambahkan item measurement.');
    } finally {
      setIsSaving(false);
    }
  };

  const startEditing = (item: MeasurementItem) => {
    setEditingId(item.id);
    setEditPillar(item.pillar);
    setEditTitle(item.title);
    setEditCriteria(item.criteria);
    setConfirmDeleteId(null);
    setListMessage(null);
  };

  const handleSaveEdit = async (id: string) => {
    setListMessage(null);
    if (editTitle.trim().length < 2 || editCriteria.trim().length < 4) {
      setListMessage({
        type: 'error',
        text: 'Nama item minimal 2 karakter dan kriteria minimal 4 karakter.',
      });
      return;
    }

    setIsUpdating(true);
    try {
      await onUpdateItem(id, {
        pillar: editPillar,
        title: editTitle.trim(),
        criteria: editCriteria.trim(),
      });
      setEditingId(null);
      setListMessage({
        type: 'success',
        text: `Item "${editTitle.trim()}" berhasil diperbarui.`,
      });
    } catch (err) {
      setListMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal menyimpan perubahan item.',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmDelete = async (item: MeasurementItem) => {
    setListMessage(null);
    setDeletingId(item.id);
    try {
      await onDeleteItem(item.id);
      setConfirmDeleteId(null);
      if (editingId === item.id) setEditingId(null);
      setListMessage({
        type: 'success',
        text: `Item "${item.code} — ${item.title}" berhasil dihapus.`,
      });
    } catch (err) {
      setListMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal menghapus item measurement.',
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section aria-labelledby="measurement-heading" className="space-y-6">
      <div className="border-b border-slate-200 pb-5">
        <p className="text-xs font-medium text-slate-500">
          Konfigurasi Measurement · Tambah, Ubah & Hapus Item Penilaian
        </p>
        <h1
          id="measurement-heading"
          className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1"
        >
          Daftar Item Measurement 5R / 5S
        </h1>
        <p className="text-sm text-slate-600 mt-1 max-w-2xl">
          Tambahkan item baru atau sesuaikan judul, kategori pilar, dan kriteria penilaian pada
          daftar measurement yang aktif sesuai kebutuhan area SPIL.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-6 space-y-4"
          noValidate
        >
          <h2 className="font-display text-base font-semibold text-slate-900">
            Tambah Measurement Baru
          </h2>

          <div>
            <label htmlFor="new-item-pillar" className="block text-xs font-medium text-slate-700 mb-1.5">
              Kategori Pilar 5R / 5S
            </label>
            <select
              id="new-item-pillar"
              value={pillar}
              onChange={(e) => setPillar(e.target.value as PillarCode)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
            >
              {PILLARS.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.code} · {p.englishName} ({p.indonesianName})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="new-item-title" className="block text-xs font-medium text-slate-700 mb-1.5">
              Nama Checklist Item
            </label>
            <input
              id="new-item-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Jalur Forklift & Pejalan Kaki"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label htmlFor="new-item-criteria" className="block text-xs font-medium text-slate-700 mb-1.5">
              Kriteria Penilaian
            </label>
            <textarea
              id="new-item-criteria"
              rows={3}
              value={criteria}
              onChange={(e) => setCriteria(e.target.value)}
              placeholder="Jelaskan kondisi standar yang diharapkan untuk skor maksimal..."
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
            />
          </div>

          {error && (
            <div role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
              {error}
            </div>
          )}

          {success && (
            <div role="status" className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#B91C1C] rounded-lg hover:bg-[#991B1B] disabled:opacity-50 cursor-pointer"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            {isSaving ? 'Menambahkan...' : 'Tambahkan ke Daftar 5S'}
          </button>
        </form>

        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="font-display text-base font-semibold text-slate-900">
              Item Aktif ({filteredItems.length} dari {items.length})
            </h2>
            <div className="relative w-full sm:w-64">
              <Search
                className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                aria-hidden="true"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Cari item measurement untuk diubah atau dihapus"
                placeholder="Cari kode atau nama item..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus-visible:outline-2 focus-visible:outline-[#B91C1C]"
              />
            </div>
          </div>

          {listMessage && (
            <div
              role={listMessage.type === 'error' ? 'alert' : 'status'}
              className={`mx-5 mt-4 rounded-lg px-3.5 py-2.5 text-xs border ${
                listMessage.type === 'error'
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}
            >
              {listMessage.text}
            </div>
          )}

          <div className="divide-y divide-slate-100 max-h-[680px] overflow-y-auto">
            {filteredItems.map((item) => {
              const isEditing = editingId === item.id;
              const isConfirmingDelete = confirmDeleteId === item.id;

              return (
                <div key={item.id} className="px-5 py-4 hover:bg-slate-50/70">
                  {isEditing ? (
                    <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-lg p-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label
                            htmlFor={`edit-pillar-${item.id}`}
                            className="block text-[11px] font-semibold text-slate-700 mb-1"
                          >
                            Pilar 5R
                          </label>
                          <select
                            id={`edit-pillar-${item.id}`}
                            value={editPillar}
                            onChange={(e) => setEditPillar(e.target.value as PillarCode)}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                          >
                            {PILLARS.map((p) => (
                              <option key={p.code} value={p.code}>
                                {p.code} · {p.englishName}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="sm:col-span-2">
                          <label
                            htmlFor={`edit-title-${item.id}`}
                            className="block text-[11px] font-semibold text-slate-700 mb-1"
                          >
                            Nama Checklist Item
                          </label>
                          <input
                            id={`edit-title-${item.id}`}
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                          />
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor={`edit-criteria-${item.id}`}
                          className="block text-[11px] font-semibold text-slate-700 mb-1"
                        >
                          Kriteria Penilaian
                        </label>
                        <textarea
                          id={`edit-criteria-${item.id}`}
                          rows={2}
                          value={editCriteria}
                          onChange={(e) => setEditCriteria(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" aria-hidden="true" />
                          Batal
                        </button>
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleSaveEdit(item.id)}
                          className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#B91C1C] rounded-lg hover:bg-[#991B1B] disabled:opacity-50 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" aria-hidden="true" />
                          {isUpdating ? 'Menyimpan...' : 'Simpan Perubahan'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span className="font-mono font-semibold text-[#B91C1C]">{item.code}</span>
                          <span aria-hidden="true">·</span>
                          <span>{item.pillar}</span>
                          {item.isCustom && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-[#B91C1C] font-medium">Item Tambahan</span>
                            </>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                        <p className="text-xs text-slate-600">{item.criteria}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => startEditing(item)}
                          aria-label={`Ubah item ${item.title}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                          Edit
                        </button>

                        {isConfirmingDelete ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={deletingId === item.id}
                              onClick={() => handleConfirmDelete(item)}
                              aria-label={`Konfirmasi hapus ${item.title}`}
                              className="px-2.5 py-1.5 text-xs font-semibold text-white bg-red-700 rounded-lg hover:bg-red-800 disabled:opacity-50 cursor-pointer"
                            >
                              {deletingId === item.id ? 'Menghapus...' : 'Konfirmasi Hapus'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
                            >
                              Batal
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmDeleteId(item.id);
                              setEditingId(null);
                              setListMessage(null);
                            }}
                            aria-label={`Hapus item ${item.title}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-50 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                            Hapus
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
