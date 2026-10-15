import numpy as np
import matplotlib.pyplot as plt

# Datos de la actividad (Puntos A a F)
valores = np.array([10, 12, 13, 17, 18, 20])  # A, B, C, D, E, F
n = len(valores)

distancias = []
semivarianzas = []

# Cálculo automatizado para cada h
for h in range(1, n):
    diferencias_sq = [(valores[i + h] - valores[i])**2 for i in range(n - h)]
    gamma = sum(diferencias_sq) / (2 * len(diferencias_sq))
    
    distancias.append(h)
    semivarianzas.append(gamma)
    print(f"h = {h} | Pares = {len(diferencias_sq)} | Gamma = {gamma:.2f}")

# Gráfica del Semivariograma experimental
plt.figure(figsize=(7, 4.5))
plt.plot(distancias, semivarianzas, marker='o', color='darkred', linestyle='-', linewidth=2)
plt.title("Semivariograma Experimental (Puntos A a F)", fontsize=12, fontweight='bold')
plt.xlabel("Distancia de separación (h)")
plt.ylabel("Semivarianza γ(h)")
plt.grid(True, linestyle='--')
plt.show()