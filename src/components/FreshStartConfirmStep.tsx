import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { FreshStartContent } from './FreshStartContent'

interface Props {
  onConfirm: () => void
}

export function FreshStartConfirmStep({ onConfirm }: Props) {
  const [confirmed, setConfirmed] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 py-12">
      <Card className="w-full max-w-2xl border-2 border-slate-200">
        <CardHeader className="bg-slate-100/50 border-b border-slate-100 pb-6">
          <CardTitle className="text-2xl">Before You Continue</CardTitle>
          <CardDescription className="text-base mt-2">
            You must create a Fresh Start sandbox budget in YNAB first.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-8">
          <FreshStartContent />

          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="flex items-start space-x-3 cursor-pointer group" onClick={() => setConfirmed(!confirmed)}>
              <Checkbox 
                id="confirm" 
                checked={confirmed} 
                onCheckedChange={(checked) => setConfirmed(checked as boolean)}
                className="mt-1"
              />
              <label
                htmlFor="confirm"
                className="text-sm font-medium leading-relaxed group-hover:text-slate-900 cursor-pointer select-none"
              >
                I confirm that I have created a Fresh Start sandbox budget in YNAB, and I understand this tool will copy transactions into it.
              </label>
            </div>
            
            <div className="mt-6 flex justify-end">
              <Button size="lg" disabled={!confirmed} onClick={onConfirm} className="px-8">
                Continue Setup →
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
