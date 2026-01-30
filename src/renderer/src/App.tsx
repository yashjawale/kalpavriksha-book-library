import Versions from './components/Versions'
import { Button } from './components/ui/button'

function App(): React.JSX.Element {
  // const ipcHandle = (): void => window.electron.ipcRenderer.send('ping')

  return (
    <>
      <Button>Button</Button>
      <Versions></Versions>
    </>
  )
}

export default App
