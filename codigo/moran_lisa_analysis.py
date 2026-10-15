import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from libpysal.weights import lat2W
from esda.moran import Moran, Moran_Local

# Configuración de semilla
np.random.seed(101)

# 1. CREACIÓN DE UNA MALLA URBANA (GRID DE 10x10 = 100 BARRIOS/DISTRITOS)
rows, cols = 10, 10
n_poligonos = rows * cols

# Matriz de pesos espaciales tipo QUEEN (Reina) para una retícula 10x10
w = lat2W(rows, cols, rook=False)
w.transform = 'R'  # Normalizada por filas

# 2. GENERACIÓN DE UNA VARIABLE SIMULADA CON AUTOCORRELACIÓN ESPACIAL
# Simulamos un nivel socioeconómico o tasa de criminalidad estructurado por zonas
x_coord, y_coord = np.meshgrid(np.linspace(0, 10, cols), np.linspace(0, 10, rows))
# Gradiente espacial con un foco concentrado (hotspot)
valores = 30 + 15 * np.sin(x_coord / 2) + 20 * np.exp(-((x_coord - 7)**2 + (y_coord - 7)**2) / 6)
valores += np.random.normal(0, 3, size=valores.shape)  # Ruido aleatorio
y = valores.flatten()

# 3. CÁLCULO DEL ÍNDICE DE MORAN GLOBAL
moran_global = Moran(y, w)

print("=" * 50)
print(f"--- RESULTADOS I DE MORAN GLOBAL ---")
print(f"Índice I de Moran Observado : {moran_global.I:.4f}")
print(f"Expectativa bajo aleatoriedad: {moran_global.EI:.4f}")
print(f"p-value de significancia     : {moran_global.p_sim:.4f}")
print("=" * 50)

# 4. CÁLCULO DEL ÍNDICE DE MORAN LOCAL (LISA)
moran_local = Moran_Local(y, w, seed=42)

# Categorización de cuadrantes LISA (Significativos p < 0.05)
# 1: High-High, 2: Low-High, 3: Low-Low, 4: High-Low
sig = moran_local.p_sim < 0.05
quadrant = moran_local.q

# Matriz de colores LISA
# 0: No significativo, 1: High-High (Rojo), 2: Low-High (Azul claro), 3: Low-Low (Azul oscuro), 4: High-Low (Rosa)
lisa_colors = np.zeros(n_poligonos)
for i in range(n_poligonos):
    if sig[i]:
        lisa_colors[i] = quadrant[i]

lisa_grid = lisa_colors.reshape((rows, cols))
y_grid = y.reshape((rows, cols))

# 5. VISUALIZACIÓN COMPLETA (3 PANELES)
fig, axes = plt.subplots(1, 3, figsize=(18, 5.5))

# Panel 1: Variable Original (Mapa Temático)
im1 = axes[0].imshow(y_grid, cmap='viridis', origin='lower')
fig.colorbar(im1, ax=axes[0], shrink=0.8, label='Valor Observado')
axes[0].set_title("1. Variable Observada por Distrito\n(Nivel Socioeconómico / Delito)", fontsize=11, fontweight='bold')

# Panel 2: Diagrama de Dispersión de Moran Global
lag_y = w.sparse.dot(y)
sns.regplot(x=y, y=lag_y, ax=axes[1], color='darkblue', scatter_kws={'alpha':0.6})
axes[1].axhline(lag_y.mean(), color='gray', linestyle='--')
axes[1].axvline(y.mean(), color='gray', linestyle='--')
axes[1].set_xlabel("Valor en el Distrito ($y$)")
axes[1].set_ylabel("Promedio de Vecinos ($Lag(y)$)")
axes[1].set_title(f"2. Diagrama de Moran Global\n$I = {moran_global.I:.3f}$ (p-val = {moran_global.p_sim:.3f})", fontsize=11, fontweight='bold')

# Panel 3: Mapa de Clústeres LISA
from matplotlib.colors import ListedColormap
# Colores: [Gris: No Sig, Rojo: HH, Azul Claro: LH, Azul Oscuro: LL, Rosa: HL]
colors_list = ['#e0e0e0', '#d7191c', '#abd9e9', '#2b83ba', '#fdae61']
cmap_lisa = ListedColormap(colors_list)

im3 = axes[2].imshow(lisa_grid, cmap=cmap_lisa, origin='lower', vmin=0, vmax=4)
axes[2].set_title("3. Mapa de Clústeres LISA (Locales)\n[Rojo: High-High | Azul: Low-Low]", fontsize=11, fontweight='bold')

# Leyenda personalizada para LISA
import matplotlib.patches as mpatches
labels = {0: 'No Significativo', 1: 'High-High (Hotspot)', 2: 'Low-High (Outlier)', 3: 'Low-Low (Coldspot)', 4: 'High-Low (Outlier)'}
patches = [mpatches.Patch(color=colors_list[i], label=labels[i]) for i in range(5) if i in lisa_colors]
axes[2].legend(handles=patches, bbox_to_anchor=(1.05, 1), loc='upper left')

plt.tight_layout()
plt.show()