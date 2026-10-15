import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from scipy.spatial import distance_matrix

# Configuración de semilla para reproducibilidad
np.random.seed(42)

# 1. GENERACIÓN DE DATOS SIMULADOS (Espacio 100x100)
# A) Patrón Agrupado (Robos: Puntos concentrados en 3 focos/hotspots)
centros = np.array([[20, 30], [70, 80], [50, 20]])
robos = np.vstack([np.random.normal(c, scale=6, size=(40, 2)) for c in centros])
robos = np.clip(robos, 0, 100) # Mantener dentro del área 100x100

# B) Patrón Regular (Nidos: Malla con leve perturbación por territorialidad)
grid_x, grid_y = np.meshgrid(np.linspace(10, 90, 10), np.linspace(10, 90, 10))
nidos = np.column_stack([grid_x.ravel(), grid_y.ravel()])
nidos += np.random.uniform(-2, 2, size=nidos.shape) # Pequeña variación natural

# 2. FUNCIÓN PARA CALCULAR EL ÍNDICE DEL VECINO MÁS CERCANO (NNI / R)
def calcular_nni(puntos, area=10000):
    n = len(puntos)
    # Matriz de distancias entre todos los puntos
    d_matrix = distance_matrix(puntos, puntos)
    np.fill_diagonal(d_matrix, np.inf) # Ignorar la distancia de un punto consigo mismo
    
    # Distancia al vecino más cercano para cada punto
    distancias_min = np.min(d_matrix, axis=1)
    d_obs = np.mean(distancias_min) # Distancia media observada
    
    # Distancia media esperada bajo aleatoriedad (CSR)
    d_exp = 0.5 / np.sqrt(n / area)
    
    # Ratio R (NNI)
    R = d_obs / d_exp
    return R, d_obs, d_exp

# Calculamos R para ambos escenarios
r_robos, d_obs_r, _ = calcular_nni(robos)
r_nidos, d_obs_n, _ = calcular_nni(nidos)

print(f"--- RESULTADOS NNI ---")
print(f"Robos (Agrupado): R = {r_robos:.3f} | Distancia media observada: {d_obs_r:.2f} m")
print(f"Nidos (Regular) : R = {r_nidos:.3f} | Distancia media observada: {d_obs_n:.2f} m")

# 3. VISUALIZACIÓN: DENSIDAD DE KERNEL (KDE)
fig, axes = plt.subplots(1, 2, figsize=(14, 6))

# Gráfico 1: Robos (KDE)
sns.kdeplot(x=robos[:, 0], y=robos[:, 1], ax=axes[0], cmap="Reds", fill=True, thresh=0, bw_adjust=0.6)
axes[0].scatter(robos[:, 0], robos[:, 1], color='black', s=15, alpha=0.7, label='Ocurrencia de Robo')
axes[0].set_title(f"Patrón Agrupado (Robos)\nNNI (R) = {r_robos:.3f} < 1", fontsize=12)
axes[0].set_xlim(0, 100); axes[0].set_ylim(0, 100)
axes[0].legend()

# Gráfico 2: Nidos (KDE)
sns.kdeplot(x=nidos[:, 0], y=nidos[:, 1], ax=axes[1], cmap="Greens", fill=True, thresh=0, bw_adjust=0.6)
axes[1].scatter(nidos[:, 0], nidos[:, 1], color='darkgreen', s=25, alpha=0.8, label='Nido de Águila')
axes[1].set_title(f"Patrón Regular (Nidos)\nNNI (R) = {r_nidos:.3f} > 1", fontsize=12)
axes[1].set_xlim(0, 100); axes[1].set_ylim(0, 100)
axes[1].legend()

plt.tight_layout()
plt.show()