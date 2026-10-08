import { useState } from 'react'
import Station4 from './workstation4/Station4.jsx'
import Station3 from './workstation3/Station3.tsx'
import './App.css'

function App() {
  const [station, setStation] = useState('3')
  return (
    <>
      {station === '3' ? <Station3 /> : <Station4 />}
      
      <div style={{ position: 'fixed', bottom: '10px', left: '10px', zIndex: 9999 }}>
        <button onClick={() => setStation('3')} style={{ marginRight: '10px', padding: '5px' }}>Station 3</button>
        <button onClick={() => setStation('4')} style={{ padding: '5px' }}>Station 4</button>
      </div>
    </>
  )
}

export default App

