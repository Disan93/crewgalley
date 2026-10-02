import { Route, Routes } from 'react-router'
import './App.css'
import { AusgabeSeite } from './ui/AusgabeSeite'
import { EinstellungenSeite } from './ui/EinstellungenSeite'
import { PersonBearbeiten } from './ui/PersonBearbeiten'
import { PersonenSeite } from './ui/PersonenSeite'
import { RezeptAnsicht } from './ui/RezeptAnsicht'
import { TripAnlegen } from './ui/TripAnlegen'
import { TripRahmen } from './ui/TripRahmen'
import { RezeptAuswahlSeite } from './ui/RezeptAuswahlSeite'
import { RezeptBearbeiten } from './ui/RezeptBearbeiten'
import { SlotSeite } from './ui/SlotSeite'
import { RezepteSeite } from './ui/RezepteSeite'
import { StartSeite } from './ui/StartSeite'
import { ZutatBearbeiten } from './ui/ZutatBearbeiten'
import { ZutatenSeite } from './ui/ZutatenSeite'

function App() {
  return (
    <Routes>
      <Route path="/" element={<StartSeite />} />
      <Route path="/trips/neu" element={<TripAnlegen />} />
      <Route path="/trips/:id/:reiter" element={<TripRahmen />} />
      <Route path="/trips/:id/kosten/ausgabe/:ausgabeId" element={<AusgabeSeite />} />
      <Route path="/trips/:id/plan/:slotId" element={<SlotSeite />} />
      <Route path="/trips/:id/plan/:slotId/rezept/:varianteId" element={<RezeptAuswahlSeite />} />
      <Route path="/personen" element={<PersonenSeite />} />
      <Route path="/personen/neu" element={<PersonBearbeiten />} />
      <Route path="/personen/:id" element={<PersonBearbeiten />} />
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
