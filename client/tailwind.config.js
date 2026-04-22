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
        // Backgrounds
        background:              'rgb(var(--color-background)          / <alpha-value>)',
        'background-warm':       'rgb(var(--color-background-warm)     / <alpha-value>)',
        'background-muted':      'rgb(var(--color-background-muted)    / <alpha-value>)',
        surface:                 'rgb(var(--color-surface)             / <alpha-value>)',
        border:                  'rgb(var(--color-border)              / <alpha-value>)',
        // Foreground
        foreground:              'rgb(var(--color-foreground)          / <alpha-value>)',
        'foreground-secondary':  'rgb(var(--color-foreground-secondary)/ <alpha-value>)',
        'foreground-muted':      'rgb(var(--color-foreground-muted)    / <alpha-value>)',
        'foreground-subtle':     'rgb(var(--color-foreground-subtle)   / <alpha-value>)',
        // Primary
        primary: {
          DEFAULT:    'rgb(var(--color-primary)            / <alpha-value>)',
          light:      'rgb(var(--color-primary-light)      / <alpha-value>)',
          dark:       'rgb(var(--color-primary-dark)       / <alpha-value>)',
          foreground: 'rgb(var(--color-primary-foreground) / <alpha-value>)',
        },
        // Secondary
        secondary: {
          DEFAULT:    'rgb(var(--color-secondary)            / <alpha-value>)',
          light:      'rgb(var(--color-secondary-light)      / <alpha-value>)',
          dark:       'rgb(var(--color-secondary-dark)       / <alpha-value>)',
          foreground: 'rgb(var(--color-secondary-foreground) / <alpha-value>)',
        },
        // Accents
        'accent-teal':           'rgb(var(--color-accent-teal)         / <alpha-value>)',
        'accent-teal-light':     'rgb(var(--color-accent-teal-light)   / <alpha-value>)',
        'accent-rose':           'rgb(var(--color-accent-rose)         / <alpha-value>)',
        'accent-rose-light':     'rgb(var(--color-accent-rose-light)   / <alpha-value>)',
        'accent-gold':           'rgb(var(--color-accent-gold)         / <alpha-value>)',
        'accent-gold-light':     'rgb(var(--color-accent-gold-light)   / <alpha-value>)',
        'accent-plum':           'rgb(var(--color-accent-plum)         / <alpha-value>)',
        'accent-plum-light':     'rgb(var(--color-accent-plum-light)   / <alpha-value>)',
        // Semantic
        success:                 'rgb(var(--color-success)             / <alpha-value>)',
        warning:                 'rgb(var(--color-warning)             / <alpha-value>)',
        error:                   'rgb(var(--color-error)               / <alpha-value>)',
        info:                    'rgb(var(--color-info)                / <alpha-value>)',
        // Badge backgrounds
        'badge-success':         'rgb(var(--color-badge-success)       / <alpha-value>)',
        'badge-warning':         'rgb(var(--color-badge-warning)       / <alpha-value>)',
        'badge-error':           'rgb(var(--color-badge-error)         / <alpha-value>)',
        'badge-info':            'rgb(var(--color-badge-info)          / <alpha-value>)',
      },
    },
  },
  plugins: [],
};
