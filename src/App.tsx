import { Routes, Route } from 'react-router-dom'

// Pages will be built after core logic review
// Placeholder import to keep the scaffold compilable
function ComingSoon() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">YNAB Budget Cloner</h1>
        <p className="text-muted-foreground">UI coming soon — core logic scaffold complete.</p>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ComingSoon />} />
    </Routes>
  )
}
