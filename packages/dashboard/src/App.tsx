import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppLayout } from './layouts/AppLayout'
import Overview from './views/Overview'
import Ranking from './views/Ranking'
import Agency from './views/Agency'

function App() {
  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/ranking" element={<Ranking />} />
          <Route path="/agency" element={<Agency />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  )
}

export default App
