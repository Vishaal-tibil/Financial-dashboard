import { useRef, useState } from 'react';
import clsx from 'clsx';
import { Icon } from '../ui/Icon';
import { useCompanies, useUpload, useDeleteCompany } from '../../api/hooks';
import { useSelections } from '../../store/selections';

export function UploadManager() {
  const { data: companies } = useCompanies();
  const upload = useUpload();
  const del = useDeleteCompany();
  const { yourCompany, competitors, setYourCompany, removeCompetitor } = useSelections();
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    setError(null);
    for (const file of Array.from(files)) {
      try {
        await upload.mutateAsync(file);
      } catch (e) {
        setError(`${file.name}: ${(e as Error).message}`);
      }
    }
  }

  async function handleDelete(id: string) {
    if (yourCompany === id) setYourCompany(null);
    if (competitors.includes(id)) removeCompetitor(id);
    await del.mutateAsync(id);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={clsx(
          'card border-2 border-dashed cursor-pointer text-center py-12 transition-colors',
          dragOver ? 'border-brand bg-brand/5' : 'border-gray-200',
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="w-12 h-12 rounded-2xl bg-brand/10 text-brand flex items-center justify-center mx-auto mb-3">
          <Icon name="upload" size={24} />
        </div>
        <p className="font-semibold text-gray-700">
          {upload.isPending ? 'Uploading & parsing…' : 'Drop Screener .xlsx files here'}
        </p>
        <p className="text-sm text-gray-500 mt-1">or click to browse. Filename becomes the company key.</p>
      </div>

      {error && (
        <div className="bg-bad/5 border border-bad/20 text-bad text-sm rounded-xl px-4 py-3 flex items-start gap-2">
          <Icon name="alert" size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="card">
        <div className="section-title text-gray-500 mb-3">
          <Icon name="building" size={15} /> Uploaded Companies ({companies?.length ?? 0})
        </div>
        {(companies?.length ?? 0) === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">No companies yet. Upload a Screener export to begin.</p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {companies!.map((c) => (
              <li key={c.company_id} className="flex items-center justify-between py-3">
                <div>
                  <div className="font-medium text-gray-800 text-sm">{c.company_name}</div>
                  <div className="text-xs text-gray-400">
                    {c.periods.length} periods ({c.periods[0]}–{c.periods[c.periods.length - 1]})
                    {c.uploaded_at && ` · ${new Date(c.uploaded_at).toLocaleString()}`}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(c.company_id)}
                  className="text-gray-400 hover:text-bad p-2 rounded-lg hover:bg-bad/5"
                  title="Delete"
                >
                  <Icon name="x" size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
