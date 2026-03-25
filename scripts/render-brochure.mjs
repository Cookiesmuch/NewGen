import fs from "node:fs";
import path from "node:path";
import Handlebars from "handlebars";

const root = process.cwd();
const templatePath = path.join(root, "Eventide", "Source", "intel_eventide_brochure.html");
const outputPath = path.join(root, "Eventide", "intel_eventide_brochure.generated.html");

const partials = {
  cpu_solar_eclipse: "Eventide/Source/CPU.Architectures/eventide.CPU.solar_eclipse.html",
  cpu_sunset_cove: "Eventide/Source/CPU.Architectures/eventide.CPU.sunset_cove.html",
  cpu_venusmont: "Eventide/Source/CPU.Architectures/eventide.CPU.venusmont.html",
  cpu_lunar_eclipse: "Eventide/Source/CPU.Architectures/eventide.CPU.lunar_eclipse.html",
  cpu_darkmont: "Eventide/Source/CPU.Architectures/eventide.CPU.darkmont.html",
  gpu_elementalist: "Eventide/Source/GPU.architectures/eventide.GPU.elementalist.html",
  gpu_druid: "Eventide/Source/GPU.architectures/eventide.GPU.druid.html",
  gpu_2d_kanvas_renderer: "Eventide/Source/GPU.architectures/eventide.GPU.2d_kanvas_renderer.html",
  tile_z_angle_memory: "Eventide/Source/Tiles/eventide.tile.z_angle_memory.html",
  tile_hnpu: "Eventide/Source/Tiles/eventide.tile.hnpu.html",
  tile_lpnpu: "Eventide/Source/Tiles/eventide.tile.lpnpu.html",
  tile_gna: "Eventide/Source/Tiles/eventide.tile.gna.html",
  tile_bionzxr: "Eventide/Source/Tiles/eventide.tile.bionzxr.html",
  tile_mfx: "Eventide/Source/Tiles/eventide.tile.mfx.html",
  tile_ipu: "Eventide/Source/Tiles/eventide.tile.ipu.html",
  tile_klangkerne: "Eventide/Source/Tiles/eventide.tile.klangkerne.html",
  tile_display: "Eventide/Source/Tiles/eventide.tile.display.html",
  tile_killer_s1: "Eventide/Source/Tiles/eventide.tile.killer_s1.html",
  tile_io: "Eventide/Source/Tiles/eventide.tile.io.html",
  tile_psm: "Eventide/Source/Tiles/eventide.tile.psm.html"
};

function requireFile(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Missing required segment file: ${relativePath}`);
  }
  return fs.readFileSync(fullPath, "utf8");
}

const templateSource = fs.readFileSync(templatePath, "utf8");

for (const [name, relPath] of Object.entries(partials)) {
  Handlebars.registerPartial(name, requireFile(relPath));
}

const render = Handlebars.compile(templateSource, { noEscape: true });
const html = render({});

fs.writeFileSync(outputPath, html, "utf8");
console.log(`Generated brochure: ${path.relative(root, outputPath)}`);
