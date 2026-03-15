import { HelpCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { FreshStartContent } from './FreshStartContent'

interface Props {
  onChangePrimaryBudget?: () => void
}

export function HowItWorksModal({ onChangePrimaryBudget }: Props = {}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="fixed top-4 right-4 z-50 gap-2 bg-white/80 backdrop-blur shadow-sm">
          <HelpCircle className="h-4 w-4" />
          How it works
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">How YNAB Budget Cloner Works</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="how-it-works" className="w-full mt-4">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="how-it-works">How It Works</TabsTrigger>
            <TabsTrigger value="api-key">API Key</TabsTrigger>
            <TabsTrigger value="fresh-start">Fresh Start</TabsTrigger>
          </TabsList>
          
          <TabsContent value="how-it-works" className="space-y-4 mt-6 text-sm leading-relaxed">
            <p>
              This tool helps you create a safe sandbox copy of your YNAB budget so you can test other integrations and apps without risking your real data.
            </p>
            <p className="font-semibold text-base mt-6">Here is the full flow:</p>
            <ol className="list-decimal list-inside space-y-3 ml-1 text-slate-800">
              <li><strong>Enter your YNAB API key</strong> — this connects the tool to your budget. Your key is stored only in your browser and never sent anywhere except the official YNAB API.</li>
              <li><strong>Create a Fresh Start budget in YNAB</strong> — this takes 30 seconds inside YNAB and creates a new separate budget with all your accounts and categories already in place.</li>
              <li><strong>Select your source and destination budgets</strong> — your real budget is the source, your Fresh Start sandbox is the destination.</li>
              <li><strong>Choose your filters</strong> — select which accounts and date range you want to copy. The default is the last 3 months.</li>
              <li><strong>Run a pre-flight check</strong> — the tool shows you exactly what will be copied, what will be skipped, and why. Nothing is written yet.</li>
              <li><strong>Clone</strong> — the tool copies your transactions into the sandbox. Your real budget is never modified.</li>
            </ol>
            
            {onChangePrimaryBudget && (
              <div className="mt-8 text-center pt-4 border-t border-slate-100">
                <DialogClose asChild>
                  <Button variant="link" className="text-sm text-slate-500 hover:text-slate-800" onClick={onChangePrimaryBudget}>
                    Change my primary budget
                  </Button>
                </DialogClose>
              </div>
            )}
          </TabsContent>

          <TabsContent value="api-key" className="space-y-4 mt-6 text-sm leading-relaxed">
            <p>
              Your YNAB personal access token is what allows this tool to read your budget and write to your sandbox. It never touches any real bank account.
            </p>
            <p className="font-semibold text-base mt-4 mb-2">Steps:</p>
            <ol className="list-decimal list-inside space-y-2 ml-1 text-slate-800">
              <li>Open YNAB in your browser and log in</li>
              <li>Click your profile icon or name in the top left corner</li>
              <li>Go to "Account Settings"</li>
              <li>Scroll down to the "Developer Settings" section</li>
              <li>Click "New Token"</li>
              <li>Enter your YNAB password to confirm</li>
              <li>Copy the token immediately — YNAB will only show it once</li>
              <li>Paste it into the API key field on this page</li>
            </ol>
            <div className="pt-2">
              <a
                href="https://app.ynab.com/settings/developer"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline font-medium"
              >
                Open YNAB Account Settings ↗
              </a>
            </div>
            <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200 text-amber-900">
              <strong>Important:</strong> Treat this token like a password. Do not share it with anyone. It gives full read and write access to your YNAB budget. You can revoke it at any time from the same Developer Settings page.
            </div>
          </TabsContent>

          <TabsContent value="fresh-start" className="mt-6">
            <FreshStartContent />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
