import { ref, provide, inject, onMounted, watch } from 'vue'
import type { Ref } from 'vue'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Ref<Theme>
  toggleTheme: () => void
}

const ThemeSymbol = Symbol('theme')

export function useThemeProvider() {
  const theme = ref<Theme>('light')
  const isInitialized = ref(false)

  // ThemeContext testing log
  console.log(`🎨 ThemeComposable: theme=${theme.value}, isInitialized=${isInitialized.value}`)

  onMounted(() => {
    // This code will only run on the client side
    const savedTheme = localStorage.getItem('theme') as Theme | null
    const initialTheme = savedTheme || 'light' // Default to light theme

    theme.value = initialTheme
    isInitialized.value = true
  })

  watch(
    theme,
    (newTheme) => {
      if (isInitialized.value) {
        localStorage.setItem('theme', newTheme)
        if (newTheme === 'dark') {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
      }
    },
    { immediate: true },
  )

  const toggleTheme = () => {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
  }

  const context: ThemeContextType = {
    theme,
    toggleTheme,
  }

  provide(ThemeSymbol, context)

  return context
}

export function useTheme(): ThemeContextType {
  const context = inject<ThemeContextType>(ThemeSymbol)
  if (!context) {
    throw new Error(
      'useTheme must be used within a component that has ThemeProvider as an ancestor',
    )
  }
  return context
}
