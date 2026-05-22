import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { Board } from '../../types'
import { Button } from '../ui/Button'
import { InputGroup } from '../ui/InputGroup'
import { Modal } from '../ui/Modal'

type BoardFormProps = {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: { title: string }) => void
  mode: 'create' | 'edit'
  initialData?: Board
}

export const BoardForm = ({ isOpen, onClose, onSubmit, mode, initialData }: BoardFormProps) => {
  const [title, setTitle] = useState('')

  useEffect(() => {
    if (isOpen) setTitle(initialData?.title ?? '')
  }, [isOpen, initialData])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit({ title })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={mode === 'edit' ? 'Projekt bearbeiten' : 'Neues Projekt'}>
      <form onSubmit={handleSubmit}>
        <InputGroup label="Projektname" value={title} onChange={setTitle} placeholder="z.B. Website Redesign" />
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>Abbrechen</Button>
          <Button type="submit">{mode === 'edit' ? 'Speichern' : 'Erstellen'}</Button>
        </div>
      </form>
    </Modal>
  )
}
