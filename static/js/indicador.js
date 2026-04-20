// // Nombre: indicador.js
// // Ubicación: static/js/
// // Función: Dibuja el indicador de Damas usando una Capa Wrapper (Nuevo método)

// window.IndicadorDamas = {
//     dibujar: function(celdaElemento) {
//         // 1. Forzamos la celda a ser un ancla usando cssText para que ningún CSS externo lo bloquee
//         celdaElemento.style.cssText += ' position: relative !important;';
        
//         // 2. Si ya dibujamos la capa aquí, no hacemos nada
//         if (celdaElemento.querySelector('.capa-indicador-wrapper')) return;

//         // 3. EL NUEVO MÉTODO: Creamos una capa invisible que cubre el 100% exacto de la celda.
//         // Al estirarse a los 4 bordes (top, bottom, left, right a 0), adopta la forma perfecta del cuadro.
//         let capaWrapper = document.createElement('div');
//         capaWrapper.className = 'capa-indicador-wrapper';
//         capaWrapper.style.cssText = `
//             position: absolute !important;
//             top: 0 !important;
//             left: 0 !important;
//             right: 0 !important;
//             bottom: 0 !important;
//             width: 100% !important;
//             height: 100% !important;
//             display: flex !important;
//             align-items: center !important;
//             justify-content: center !important;
//             pointer-events: none !important;
//             z-index: 50 !important;
//             margin: 0 !important;
//             padding: 0 !important;
//         `;

//         // 4. Creamos el punto. Como vive dentro de la "Capa Wrapper" que es Flexbox,
//         // se centrará maravillosamente sin usar coordenadas absolutas, margins raros ni transformaciones.
//         let punto = document.createElement('div');
//         punto.style.cssText = `
//             width: 20px !important;
//             height: 20px !important;
//             background-color: #ffd700 !important;
//             border-radius: 50% !important;
//             box-shadow: 0 0 15px rgba(255, 215, 0, 1) !important;
//             pointer-events: none !important;
//             flex-shrink: 0 !important;
//         `;

//         // Metemos el punto en la capa, y la capa en la celda
//         capaWrapper.appendChild(punto);
//         celdaElemento.appendChild(capaWrapper);
//     }
// };