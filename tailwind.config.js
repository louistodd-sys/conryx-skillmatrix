/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  safelist: [
    'bg-green-100', 'bg-green-500', 'text-green-700', 'text-green-50',
    'bg-amber-100', 'bg-amber-500', 'text-amber-700', 'text-amber-50',
    'bg-red-100', 'bg-red-500', 'text-red-700', 'text-red-50',
    'bg-gray-100', 'bg-gray-500', 'text-gray-700', 'text-gray-50',
    'bg-blue-100', 'bg-blue-500', 'text-blue-700', 'text-blue-50',
    'border-green-300', 'border-amber-300', 'border-red-300', 'border-gray-300', 'border-blue-300',
  ],
  theme: {
    extend: {
      fontFamily: {
        inter: ['var(--font-inter)'],
        jakarta: ['var(--font-jakarta)'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
        'xs':  ['0.75rem',   { lineHeight: '1.125rem' }],
        'sm':  ['0.8125rem', { lineHeight: '1.25rem' }],
        'base':['0.875rem',  { lineHeight: '1.5rem' }],
        'md':  ['0.9375rem', { lineHeight: '1.5rem' }],
        'lg':  ['1rem',      { lineHeight: '1.6rem' }],
        'xl':  ['1.125rem',  { lineHeight: '1.75rem' }],
        '2xl': ['1.25rem',   { lineHeight: '1.875rem' }],
        '3xl': ['1.5rem',    { lineHeight: '2rem' }],
        '4xl': ['1.875rem',  { lineHeight: '2.25rem' }],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 3px)',
        sm: 'calc(var(--radius) - 6px)',
        xl: 'calc(var(--radius) + 4px)',
        '2xl': 'calc(var(--radius) + 8px)',
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        brand: {
          primary: 'hsl(var(--brand-primary))',
          accent:  'hsl(var(--brand-accent))',
        },
        card: {
          DEFAULT:    'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT:    'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT:    'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT:    'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT:    'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT:    'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT:    'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input:  'hsl(var(--input))',
        ring:   'hsl(var(--ring))',
        chart: {
          1: 'hsl(var(--chart-1))',
          2: 'hsl(var(--chart-2))',
          3: 'hsl(var(--chart-3))',
          4: 'hsl(var(--chart-4))',
          5: 'hsl(var(--chart-5))',
        },
        sidebar: {
          DEFAULT:              'hsl(var(--sidebar-background))',
          foreground:           'hsl(var(--sidebar-foreground))',
          primary:              'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent:               'hsl(var(--sidebar-accent))',
          'accent-foreground':  'hsl(var(--sidebar-accent-foreground))',
          border:               'hsl(var(--sidebar-border))',
          ring:                 'hsl(var(--sidebar-ring))',
        },
        rag: {
          green:        'hsl(var(--rag-green))',
          'green-light':'hsl(var(--rag-green-light))',
          'green-text': 'hsl(var(--rag-green-text))',
          amber:        'hsl(var(--rag-amber))',
          'amber-light':'hsl(var(--rag-amber-light))',
          'amber-text': 'hsl(var(--rag-amber-text))',
          red:          'hsl(var(--rag-red))',
          'red-light':  'hsl(var(--rag-red-light))',
          'red-text':   'hsl(var(--rag-red-text))',
          grey:         'hsl(var(--rag-grey))',
          'grey-light': 'hsl(var(--rag-grey-light))',
          'grey-text':  'hsl(var(--rag-grey-text))',
        },
      },
      boxShadow: {
        'card':   '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        'card-md':'0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.07)',
        'card-lg':'0 10px 15px -3px rgb(0 0 0 / 0.07), 0 4px 6px -4px rgb(0 0 0 / 0.06)',
        'sidebar':'4px 0 24px 0 rgb(0 0 0 / 0.18)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to:   { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to:   { height: '0' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-left': {
          from: { transform: 'translateX(-100%)' },
          to:   { transform: 'translateX(0)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up':   'accordion-up 0.2s ease-out',
        'fade-in':        'fade-in 0.18s ease-out',
        'slide-in-left':  'slide-in-left 0.22s ease-out',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
