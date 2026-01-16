// This file fakes Tailwind’s old defaultConfig for backward compatibility
import defaultTheme from 'tailwindcss/defaultTheme'

export default {
  theme: {
    screens: defaultTheme.screens,
  },
}
