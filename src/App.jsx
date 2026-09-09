import { HashRouter, Route, Routes } from 'react-router-dom'
import Connect from './pages/Connect'
import CameraScreen from './pages/Camera'

export default function App() {
  return (
    <HashRouter>
      <div className="h-full w-full">
        <Routes>
          <Route path="/" element={<Connect />} />
          <Route path="/camera" element={<CameraScreen />} />
        </Routes>
      </div>
    </HashRouter>
  )
}
