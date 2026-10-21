/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}'],
  theme: {
    extend: {
      colors: {
        primary_craft: '#DEE4DB',
        accent_craft: '#C2AADA',
        menu_craft: '#d3bdff'
      },
      fontFamily: {
        heading: ['"Fraunces"', 'Georgia', 'serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
};
