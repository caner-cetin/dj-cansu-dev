import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
// Import the generated route tree
import { routeTree } from './routeTree.gen'
import NotFound from './components/404'
const queryClient = new QueryClient()
const router = createRouter({ routeTree, defaultNotFoundComponent: NotFound })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
// biome-ignore lint/style/noNonNullAssertion: <shut up>
const rootElement = document.getElementById('root')!
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}