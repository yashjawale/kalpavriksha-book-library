export function useToast() {
  return {
    toast: (options: {
      title?: string
      description?: string
      variant?: 'default' | 'destructive'
      duration?: number
    }) => {
      console.log('Toast:', options.title, options.description)
      // Fallback for simple toasts if UI component isn't installed
      if (options.variant === 'destructive') {
        console.error(options.title, options.description)
      }
    }
  }
}
