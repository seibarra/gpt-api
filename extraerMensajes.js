// extraerMensajes.js
export default function extraerMensajesNuevosConInicio(textoNotificacion, newData) {
    if (!textoNotificacion || !newData) {
      return '';
    }
  
    const lineas = textoNotificacion.split('\n');
    const newDataNormalized = newData.trim();
    let startIndex = -1;
  
    // Buscar desde el final la última aparición de newData
    for (let i = lineas.length - 1; i >= 0; i--) {
      if (lineas[i].trim() === newDataNormalized) {
        startIndex = i;
        break;
      }
    }
  
    // Si se encontró, devolver desde esa línea hasta el final
    if (startIndex !== -1) {
      return lineas.slice(startIndex).join('\n');
    }
  
    return '';
}
  