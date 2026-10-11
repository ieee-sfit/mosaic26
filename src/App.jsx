import Station4 from './workstation4'
import './App.css'

function App() {
  const [activeStation, setActiveStation] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const st = params.get('station');
      if (st === '4') return 4;
      if (st === '1') return 1;
    }
    return 1; // Default to Station 1
  });

  const handleSelectStation = (stNum) => {
    setActiveStation(stNum);
    if (typeof window !== 'undefined' && window.history) {
      const url = new URL(window.location);
      url.searchParams.set('station', String(stNum));
      window.history.pushState({}, '', url);
    }
  };

  return (
    <>
      <Station4 />
    </>
  )
}

export default App

