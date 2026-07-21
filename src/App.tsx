import { MantineProvider } from '@mantine/core'
import { NewTab } from './newtab/NewTab'

function App() {
  return (
    <MantineProvider defaultColorScheme="auto">
      <NewTab />
    </MantineProvider>
  )
}

export default App
