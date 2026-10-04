import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect } from 'react'
import { Route, Routes } from 'react-router'
import './App.css'
import { db } from './db/datenbank'
import { AusgabeSeite } from './ui/AusgabeSeite'
import { wendeDesignAn } from './ui/design'
import { EinstellungenSeite } from './ui/EinstellungenSeite'
import { PersonBearbeiten } from './ui/PersonBearbeiten'
import { PersonenSeite } from './ui/PersonenSeite'
import { ProSeite } from './ui/ProSeite'
import { RezeptAnsicht } from './ui/RezeptAnsicht'
import { RezeptAuswahlSeite } from './ui/RezeptAuswahlSeite'
import { RezeptBearbeiten } from './ui/RezeptBearbeiten'
import { RezepteSeite } from './ui/RezepteSeite'
import { SlotSeite } from './ui/SlotSeite'
import { StartSeite } from './ui/StartSeite'
import { TripAnlegen } from './ui/TripAnlegen'
import { TripRahmen } from './ui/TripRahmen'
import { ZutatBearbeiten } from './ui/ZutatBearbeiten'
import { ZutatenSeite } from './ui/ZutatenSeite'

function App() {
  // Hell/Dunkel folgt der Einstellung, auch nach dem Wiederherstellen einer Sicherung
  const design = useLiveQuery(async () => (await db.einstellungen.get('app'))?.design)
  useEffect(() => {
    if (design) wendeDesignAn(design)
  }, [design])

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
      <Route path="/pro" element={<ProSeite />} />
      <Route path="*" element={<StartSeite />} />
    </Routes>
  )
}

export default App
