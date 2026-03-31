import { motion, AnimatePresence } from 'framer-motion'
import { Undo2 } from 'lucide-react'

interface UndoSnackbarProps {
  visible: boolean
  onUndo: () => void
}

export function UndoSnackbar({ visible, onUndo }: UndoSnackbarProps): React.JSX.Element {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.15 }}
          className="absolute bottom-12 left-3 right-3 z-50"
        >
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-card border border-border shadow-lg">
            <span className="text-xs text-muted-foreground">Action applied</span>
            <button
              onClick={onUndo}
              className="flex items-center gap-1 text-xs text-primary font-medium hover:text-primary/80 transition-colors"
            >
              <Undo2 className="w-3 h-3" />
              Undo
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
