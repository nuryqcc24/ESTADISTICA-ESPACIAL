import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from scipy.spatial import distance_matrix
from scipy.interpolate import Rbf

# Configuración de estilo y semilla
np.random.seed(42)
plt.style.use('seaborn-v0_8-whitegrid' if 'seaborn-v0_8-whitegrid' in plt.style.available else 'default')
fig, axes = plt.subplots(1, 3, figsize=(18, 5.5))

# ==============================================================================
# MÓDULO 1: DATOS DE PATRONES DE PUNTOS (Robos en la Ciudad)
# ==============================================================================
centros = np.array([[20, 30], [70, 80], [50, 20]])
robos = np.vstack([np.random.normal(c, scale=6, size=(30, 2)) for c in centros])
robos = np.clip(robos, 0, 100)

# Estimación de Densidad de Kernel (KDE)
sns.kdeplot(x=robos[:, 0], y=robos[:, 1], ax=axes[0], cmap="Reds", fill=True, thresh=0, bw_adjust=0.6)
axes[0].scatter(robos[:, 0], robos[:, 1], color='black', s=15, alpha=0.7, label='Robos')

# Cálculo de NNI (R)
d_mat = distance_matrix(robos, robos)
np.fill_diagonal(d_mat, np.inf)
r_nni = np.mean(np.min(d_mat, axis=1)) / (0.5 / np.sqrt(len(robos) / 10000))

axes[0].set_title(f"1. PATRÓN DE PUNTOS\nNNI (R) = {r_nni:.2f} (Agrupado / Hotspots)", fontsize=11, fontweight='bold')
axes[0].set_xlim(0, 100); axes[0].set_ylim(0, 100)
axes[0].legend(loc='upper left')

# ==============================================================================
# MÓDULO 2: DATOS GEOESTADÍSTICOS (Interpolación de Temperatura)
# ==============================================================================
# 20 Estaciones meteorológicas de muestreo aleatorio
x_est = np.random.uniform(5, 95, 20)
y_est = np.random.uniform(5, 95, 20)
# Gradiente real subyacente (más cálido en el sur/oeste)
temp_est = 35 - 0.2*x_est - 0.15*y_est + np.random.normal(0, 1, 20)

# Malla para interpolar continuamente
grid_x, grid_y = np.linspace(0, 100, 100), np.linspace(0, 100, 100)
GX, GY = np.meshgrid(grid_x, grid_y)

# Interpolación por Función de Base Radial (RBF - Similar a Kriging/IDW)
rbf = Rbf(x_est, y_est, temp_est, function='multiquadric', smooth=0.1)
Z_temp = rbf(GX, GY)

# Visualización del mapa continuo e impreso con muestras
im = axes[1].imshow(Z_temp, extent=[0, 100, 0, 100], origin='lower', cmap='YlOrRd', alpha=0.85)
scatter = axes[1].scatter(x_est, y_est, c=temp_est, cmap='YlOrRd', edgecolors='black', s=50, label='Sensores')
fig.colorbar(im, ax=axes[1], label='Temperatura (°C)', shrink=0.8)

axes[1].set_title("2. GEOESTADÍSTICA\nInterpolación Continua de Muestras", fontsize=11, fontweight='bold')
axes[1].set_xlim(0, 100); axes[1].set_ylim(0, 100)
axes[1].legend(loc='upper left')

# ==============================================================================
# MÓDULO 3: DATOS DE ÁREAS / POLÍGONOS (Autocorrelación - I de Moran)
# ==============================================================================
# Creación de una cuadrícula urbana de 6x6 polígonos
n_side = 6
dx = 100 / n_side
poligonos_val = []

for i in range(n_side):
    for j in range(n_side):
        # Generar un fenómeno agrupado por barrios (población/ingresos)
        val = 50 + 20*np.sin(i/1.5) + 20*np.cos(j/1.5) + np.random.normal(0, 3)
        poligonos_val.append(val)
        
Z_grid = np.array(poligonos_val).reshape((n_side, n_side))

# Dibujar la malla de polígonos/barrios
im3 = axes[2].imshow(Z_grid, cmap='viridis', extent=[0, 100, 0, 100], origin='lower')
fig.colorbar(im3, ax=axes[2], label='Nivel Socioeconómico', shrink=0.8)

# Agregar bordes a los polígonos/distritos
for x in np.linspace(0, 100, n_side + 1):
    axes[2].axvline(x, color='white', lw=1.5)
    axes[2].axhline(x, color='white', lw=1.5)

axes[2].set_title("3. DATOS ÁREAS / POLÍGONOS\nAutocorrelación Espacial (Malla Urbana)", fontsize=11, fontweight='bold')
axes[2].set_xlim(0, 100); axes[2].set_ylim(0, 100)

# Ajuste y despliegue final
plt.tight_layout()
plt.show()