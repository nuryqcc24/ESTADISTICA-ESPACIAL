import geopandas as gpd
import matplotlib.pyplot as plt
from libpysal.weights import Queen
from esda.moran import Moran, Moran_Local
from matplotlib.colors import ListedColormap
import matplotlib.patches as mpatches

# 1. CARGAR DATASET ESPACIAL REAL INCLUIDO LOCALMENTE EN GEOPANDAS (América del Sur)
path = gpd.datasets.get_path('naturalearth_lowres') if hasattr(gpd.datasets, 'get_path') else None

if not path:
    # Alternativa segura que lee directamente de los archivos de geopandas instalados en tu PC
    import libpysal
    path = libpysal.examples.get_path('Guerry.shp')
    gdf = gpd.read_file(path)
    var_analisis = 'Crm_prp'  # Crimen de propiedad en departamentos de Francia
    titulo_var = "Tasa de Crimen de Propiedad (Francia)"
else:
    world = gpd.read_file(path)
    gdf = world[world['continent'] == 'South America'].copy().reset_index(drop=True)
    var_analisis = 'pop_est'   # Población estimada por país en Sudamérica
    titulo_var = "Población Estimada (América del Sur)"

# 2. MATRIZ DE PESOS ESPACIALES (QUEEN)
w = Queen.from_dataframe(gdf, use_index=False)
w.transform = 'R'

# 3. ÍNDICE DE MORAN GLOBAL
moran = Moran(gdf[var_analisis], w)

print("=" * 50)
print(f"ANÁLISIS ESPACIAL CON DATOS REALES LOCALES")
print(f"Variable analizada       : {var_analisis}")
print(f"Índice I de Moran Global : {moran.I:.4f}")
print(f"p-value de significancia  : {moran.p_sim:.4f}")
print("=" * 50)

# 4. ÍNDICE DE MORAN LOCAL (LISA)
moran_loc = Moran_Local(gdf[var_analisis], w, seed=42)
gdf['sig'] = moran_loc.p_sim < 0.05
gdf['quadrant'] = moran_loc.q

# Categorías LISA
gdf['lisa_type'] = 0  # No significativo
for i in range(len(gdf)):
    if gdf.loc[i, 'sig']:
        gdf.loc[i, 'lisa_type'] = gdf.loc[i, 'quadrant']

# 5. DIBUJAR LOS MAPAS
fig, axes = plt.subplots(1, 2, figsize=(14, 7))

# Mapa 1: Variable Real Observada
gdf.plot(column=var_analisis, cmap='YlOrRd', legend=True, ax=axes[0],
         edgecolor='black', linewidth=0.5)
axes[0].set_title(titulo_var, fontweight='bold')

# Mapa 2: Clústeres LISA
colors = ['#e0e0e0', '#d7191c', '#abd9e9', '#2b83ba', '#fdae61']
cmap_lisa = ListedColormap(colors)

gdf.plot(column='lisa_type', cmap=cmap_lisa, vmin=0, vmax=4, ax=axes[1], edgecolor='black', linewidth=0.5)
axes[1].set_title(f"Mapa LISA (Moran Global I = {moran.I:.3f})", fontweight='bold')

# Leyenda
patches = [mpatches.Patch(color=colors[0], label='No Significativo'),
           mpatches.Patch(color=colors[1], label='High-High (Hotspot)'),
           mpatches.Patch(color=colors[3], label='Low-Low (Coldspot)')]
axes[1].legend(handles=patches, loc='lower left')

plt.tight_layout()
plt.show()