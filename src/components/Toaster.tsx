import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, X } from "lucide-react";
import { useStore } from "../lib/store";

export default function Toaster() {
  const { toasts, dismiss } = useStore();
  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-[80] flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2" aria-live="polite">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div key={t.id} layout initial={{ opacity: 0, y: 16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: 40 }}
            className="pointer-events-auto flex items-start gap-3 rounded-xl border border-line bg-panel p-3.5 shadow-2xl" role="status">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-good" />
            <div className="flex-1"><p className="text-sm font-medium">{t.title}</p>{t.body && <p className="mt-0.5 text-[13px] text-muted">{t.body}</p>}</div>
            {t.undo && <button onClick={() => { t.undo!(); dismiss(t.id); }} className="rounded-md px-2 py-1 text-sm font-medium text-accent hover:bg-accent-soft">Undo</button>}
            <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="rounded-md p-1 text-muted hover:text-fg"><X size={14} /></button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
