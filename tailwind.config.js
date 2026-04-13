import plugin from "tailwindcss/plugin"

export default {
  content: ["./index.html", "./src/**/*.{vue,js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0f172a",
        mist: "#eef2ff",
        pulse: "#16a34a",
      },
      boxShadow: {
        panel: "0 18px 50px rgba(15, 23, 42, 0.08)",
      },
    },
  },
  plugins: [
    plugin(({ addUtilities }) => {
      addUtilities({
        ".bg-workspace-grid": {
          backgroundColor: "#fff",
          backgroundImage: `
            linear-gradient(
              to right,
              rgba(198, 198, 198, 0.55) 1px,
              transparent 1px
            ),
            linear-gradient(
              to bottom,
              rgba(198, 198, 198, 0.55) 1px,
              transparent 1px
            )
          `,
          backgroundPosition: "top left",
          backgroundSize: "32px 32px",
        },
      })
    }),
  ],
}
