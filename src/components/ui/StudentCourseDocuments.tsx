import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Eye, FileText } from 'lucide-react';
import { documentsApi } from '../../api/documentsApi';
import { apiErrorMessage } from '../../api/client';
import { Modal } from './Modal';

interface StudentCourseDocumentsProps {
  courseId: number;
}

export function StudentCourseDocuments({ courseId }: StudentCourseDocumentsProps) {
  const [preview, setPreview] = useState<{ title: string; url: string } | null>(null);
  const { data: documents = [], isLoading, error } = useQuery({
    queryKey: ['course-documents', courseId],
    queryFn: () => documentsApi.list(courseId),
  });
  const openDocument = useMutation({
    mutationFn: async (document: { id: number; title: string }) => ({
      document,
      file: await documentsApi.getFile(courseId, document.id),
    }),
    onSuccess: ({ document, file }) => {
      setPreview({ title: document.title, url: URL.createObjectURL(file) });
    },
  });

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview.url);
    };
  }, [preview]);

  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Documents PDF du cours
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Consultez les documents partagés par votre enseignant.
          </p>
        </div>
        {isLoading ? (
          <p className="text-xs text-slate-500">Chargement des documents…</p>
        ) : error ? (
          <p role="alert" className="text-xs text-red-600">
            {apiErrorMessage(error, 'Impossible de charger les documents du cours.')}
          </p>
        ) : documents.length === 0 ? (
          <p className="rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-500 dark:bg-slate-800">
            Aucun PDF disponible pour le moment.
          </p>
        ) : (
          <ul className="space-y-2">
            {documents.map((document) => (
              <li
                key={document.id}
                className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800"
              >
                <FileText className="h-4 w-4 shrink-0 text-indigo-600" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-slate-800 dark:text-slate-100">
                    {document.title}
                  </p>
                  {document.pageCount > 0 && (
                    <p className="mt-1 text-[10px] text-slate-500">
                      {document.pageCount} page(s)
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => openDocument.mutate(document)}
                  disabled={openDocument.isPending}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  <Eye className="h-3.5 w-3.5" />
                  {openDocument.isPending &&
                  openDocument.variables?.id === document.id
                    ? 'Ouverture…'
                    : 'Afficher'}
                </button>
              </li>
            ))}
          </ul>
        )}
        {openDocument.error && (
          <p role="alert" className="mt-3 text-xs text-red-600">
            {apiErrorMessage(openDocument.error, 'Impossible d’ouvrir ce PDF.')}
          </p>
        )}
      </section>
      <Modal
        open={!!preview}
        onClose={() => setPreview(null)}
        title={preview?.title}
        size="xl"
      >
        {preview && (
          <iframe
            title={preview.title}
            src={preview.url}
            className="h-[70vh] w-full"
          />
        )}
      </Modal>
    </>
  );
}
