/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background:  'rgb(var(--color-background)  / <alpha-value>)',
        foreground:  'rgb(var(--color-foreground)  / <alpha-value>)',
        card:        'rgb(var(--color-card)        / <alpha-value>)',
        input:       'rgb(var(--color-input)       / <alpha-value>)',
        muted: {
          DEFAULT:    'rgb(var(--color-muted)            / <alpha-value>)',
          foreground: 'rgb(var(--color-muted-foreground) / <alpha-value>)',
        },
        border:      'rgb(var(--color-border)      / <alpha-value>)',
        primary: {
          DEFAULT:    'rgb(var(--color-primary)            / <alpha-value>)',
          foreground: 'rgb(var(--color-primary-foreground) / <alpha-value>)',
        },
        accent:      'rgb(var(--color-accent)      / <alpha-value>)',
        destructive: 'rgb(var(--color-destructive) / <alpha-value>)',
      },
    },
  },
  plugins: [],
};
