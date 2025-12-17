import { repos } from "./repos.js";

const GITHUB_USERNAME = "shamilkotta";

// Color mappings for grayscale contribution graph
function getContributionColors(isDark) {
  if (isDark) {
    // Dark theme: grey to white (no contribution = visible grey, high = white)
    return {
      level0: "#3a3a3a", // No contributions - visible grey
      level1: "#6a6a6a", // Low
      level2: "#9a9a9a", // Medium-low
      level3: "#cacaca", // Medium-high
      level4: "#ffffff", // High - white
    };
  } else {
    // Light theme: light grey to black (no contribution = light grey, high = black)
    return {
      level0: "#e0e0e0", // No contributions - light grey
      level1: "#b0b0b0", // Low
      level2: "#808080", // Medium-low
      level3: "#404040", // Medium-high
      level4: "#000000", // High - black
    };
  }
}

// Function to process SVG and apply custom colors
function processContributionSvg(svgText, isDark) {
  const colors = getContributionColors(isDark);

  // All known GitHub contribution colors (light and dark themes)
  const colorMap = {
    // Light theme no-contribution colors (map to level0)
    "#ebedf0": colors.level0,
    "#f0f0f0": colors.level0,
    "#eeeeee": colors.level0,
    "#e8e8e8": colors.level0,
    "#ffffff": colors.level0, // White should be no-contribution
    "#fff": colors.level0,
    // Dark theme no-contribution colors
    "#161b22": colors.level0,
    "#1b1f23": colors.level0,
    "#21262d": colors.level0,
    "#0d1117": colors.level0,
    // Level 1 greens
    "#9be9a8": colors.level1,
    "#0e4429": colors.level1,
    "#1e4620": colors.level1,
    "#c6e48b": colors.level1,
    // Level 2 greens
    "#40c463": colors.level2,
    "#006d32": colors.level2,
    "#238636": colors.level2,
    "#7bc96f": colors.level2,
    // Level 3 greens
    "#30a14e": colors.level3,
    "#26a641": colors.level3,
    "#2ea043": colors.level3,
    "#239a3b": colors.level3,
    // Level 4 greens (highest)
    "#216e39": colors.level4,
    "#39d353": colors.level4,
    "#56d364": colors.level4,
    "#196127": colors.level4,
  };

  let processedSvg = svgText;

  // Replace all known colors
  for (const [original, replacement] of Object.entries(colorMap)) {
    // Match fill="color" or fill='color' or fill:color
    const regex = new RegExp(
      `(fill[=:]\\s*["']?)${original.replace("#", "\\#?")}(["']?)`,
      "gi"
    );
    processedSvg = processedSvg.replace(regex, `$1${replacement}$2`);

    // Also match style="fill:color"
    const styleRegex = new RegExp(
      `(style="[^"]*fill:\\s*)${original.replace("#", "\\#?")}`,
      "gi"
    );
    processedSvg = processedSvg.replace(styleRegex, `$1${replacement}`);
  }

  // Remove text elements (contribution count and Less/More labels)
  processedSvg = processedSvg.replace(/<text[^>]*>[\s\S]*?<\/text>/gi, "");

  // Also remove any g elements that contain only text
  processedSvg = processedSvg.replace(/<g[^>]*>[\s\n]*<\/g>/gi, "");

  // Inject CSS styles to override any remaining colors
  const cssOverride = `
    <style>
      rect[fill="#ebedf0"], rect[fill="#161b22"], rect[fill="#ffffff"], rect[fill="#fff"], 
      rect[fill="#f0f0f0"], rect[fill="#eeeeee"], rect[fill="#e8e8e8"], rect[fill="#1b1f23"], 
      rect[fill="#21262d"], rect[fill="#0d1117"] { fill: ${colors.level0} !important; }
      rect[fill="#9be9a8"], rect[fill="#0e4429"], rect[fill="#c6e48b"], rect[fill="#1e4620"] { fill: ${colors.level1} !important; }
      rect[fill="#40c463"], rect[fill="#006d32"], rect[fill="#7bc96f"], rect[fill="#238636"] { fill: ${colors.level2} !important; }
      rect[fill="#30a14e"], rect[fill="#26a641"], rect[fill="#239a3b"], rect[fill="#2ea043"] { fill: ${colors.level3} !important; }
      rect[fill="#216e39"], rect[fill="#39d353"], rect[fill="#196127"], rect[fill="#56d364"] { fill: ${colors.level4} !important; }
      text { display: none !important; }
    </style>
  `;

  // Insert CSS after opening svg tag
  processedSvg = processedSvg.replace(/<svg([^>]*)>/, `<svg$1>${cssOverride}`);

  return processedSvg;
}

// Function to load contribution graph
async function loadContributionGraph() {
  const graphContainer = document.getElementById("contribution-graph");
  if (!graphContainer) return;

  try {
    const isDark =
      document.documentElement.getAttribute("data-theme") === "dark";
    const theme = isDark ? "dark" : "light";

    // Fetch SVG directly to modify colors
    const graphUrl = `https://github-contributions-api.deno.dev/${GITHUB_USERNAME}.svg?theme=${theme}`;

    const response = await fetch(graphUrl);
    if (!response.ok) {
      throw new Error("Failed to fetch contribution graph");
    }

    let svgText = await response.text();

    // Process SVG with custom grayscale colors and remove text
    svgText = processContributionSvg(svgText, isDark);

    // Insert the processed SVG
    graphContainer.innerHTML = `
      <div style="width: 100%; overflow-x: auto; display: flex; justify-content: center;" id="contribution-svg-container">
        ${svgText}
      </div>
    `;

    // Style the SVG
    const svg = graphContainer.querySelector("svg");
    if (svg) {
      svg.style.width = "100%";
      svg.style.maxWidth = "100%";
      svg.style.height = "auto";
    }
  } catch (error) {
    console.error("Error loading contribution graph:", error);
    graphContainer.innerHTML = `
      <p style="color: var(--subtle-foreground); text-align: center;">
        Unable to load contribution graph. Please try again later.
      </p>
    `;
  }
}

// Function to update graph theme
async function updateGraphTheme() {
  await loadContributionGraph();
}

document.addEventListener("DOMContentLoaded", () => {
  const repoList = document.getElementById("repo-list");
  const themeToggle = document.getElementById("theme-toggle");

  // Check if repoList element exists
  if (!repoList) {
    console.error("repo-list element not found!");
    return;
  }

  // Check if repos are loaded
  if (!repos || repos.length === 0) {
    console.error("No repos found!");
    repoList.innerHTML = "<p>No repositories found.</p>";
    return;
  }

  console.log(`Loaded ${repos.length} repositories`);

  // Theme switcher
  const currentTheme = localStorage.getItem("theme");
  if (currentTheme) {
    document.documentElement.setAttribute("data-theme", currentTheme);
  }

  // Load contribution graph (after theme is set)
  loadContributionGraph();

  themeToggle.addEventListener("click", () => {
    let theme = document.documentElement.getAttribute("data-theme");
    if (theme === "dark") {
      theme = "light";
    } else {
      theme = "dark";
    }
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);

    // Update graph theme
    updateGraphTheme();

    // Add icon rotation animation
    themeToggle.classList.add("theme-transition");
    setTimeout(() => {
      themeToggle.classList.remove("theme-transition");
    }, 500);
  });

  // Render repos from local data
  repos.forEach((repo) => {
    const repoCard = document.createElement("div");
    repoCard.classList.add("repo-card");

    const titleLink = document.createElement("a");
    titleLink.href = repo.html_url;
    titleLink.target = "_blank";

    const title = document.createElement("h2");
    title.textContent = repo.name;
    titleLink.appendChild(title);

    const repoUrl = document.createElement("p");
    repoUrl.classList.add("repo-url");
    repoUrl.textContent = repo.full_name;

    const description = document.createElement("p");
    description.textContent = repo.description || "No description available.";

    const links = document.createElement("div");
    links.classList.add("repo-links");

    if (repo.homepage && repo.homepage.trim() !== "") {
      const liveLink = document.createElement("a");
      liveLink.href = repo.homepage;
      liveLink.textContent = "Live Demo";
      liveLink.target = "_blank";
      links.appendChild(liveLink);
    }

    repoCard.appendChild(titleLink);
    repoCard.appendChild(repoUrl);
    repoCard.appendChild(description);
    repoCard.appendChild(links);

    repoList.appendChild(repoCard);
  });
});
