import { Route, Routes } from 'react-router'
import './App.css'
import { EinstellungenSeite } from './ui/EinstellungenSeite'
import { RezeptAnsicht } from './ui/RezeptAnsicht'
import { RezeptBearbeiten } from './ui/RezeptBearbeiten'
import { RezepteSeite } from './ui/RezepteSeite'
import { StartSeite } from './ui/StartSeite'
import { ZutatBearbeiten } from './ui/ZutatBearbeiten'
import { ZutatenSeite } from './ui/ZutatenSeite'

function App() {
  return (
    <Routes>
      <Route path="/" element={<StartSeite />} />
      <Route path="/rezepte" element={<RezepteSeite />} />
      <Route path="/rezepte/neu" element={<RezeptBearbeiten />} />
      <Route path="/rezepte/:id" element={<RezeptAnsicht />} />
      <Route path="/rezepte/:id/bearbeiten" element={<RezeptBearbeiten />} />
      <Route path="/zutaten" element={<ZutatenSeite />} />
      <Route path="/zutaten/neu" element={<ZutatBearbeiten />} />
      <Route path="/zutaten/:id" element={<ZutatBearbeiten />} />
      <Route path="/einstellungen" element={<EinstellungenSeite />} />
      <Route path="*" element={<StartSeite />} />
    </Routes>
  )
}

export default App
