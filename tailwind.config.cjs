/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}'],
  theme: {
    extend: {
      colors: {
        accent_craft: '#5e35b8'
      },
      fontFamily: {
        heading: ['"Fraunces"', 'Georgia', 'serif'],
        body: ['"Outfit"', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
};
