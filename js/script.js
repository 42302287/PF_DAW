// Obtenemos los elementos del formulario y de la página.
const formularioBusqueda = document.getElementById("formBusqueda");
const campoBusqueda = document.getElementById("cadenaBusqueda");
const avisoBusqueda = document.getElementById("errorBusqueda");

// Obtenemos la sección donde se mostrarán los resultados.
const seccionResultados = document.getElementById("seccion-respuestas");
const contenedorObras = document.getElementById("obras");
const botonBuscar = formularioBusqueda.querySelector('button[type="submit"]');

// URL de la API que contiene la información de las obras de arte.
const urlApiObras = "https://nearness-cyclist-debtor.ngrok-free.dev/pf/obras/index.php";

// Registramos el evento que ejecutará la función de búsqueda.
formularioBusqueda.addEventListener("submit", buscarObras);

async function buscarObras(evento) {
    // Evitamos que la página se recargue al enviar el formulario.
    evento.preventDefault();

    // Obtenemos el texto ingresado en el campo de búsqueda.
    const terminoBusqueda = campoBusqueda.value.trim();
    avisoBusqueda.textContent = "";

    // Comprobamos que el usuario haya escrito algún dato.
    if (!terminoBusqueda) {
        avisoBusqueda.textContent = "Proporciona una cadena de búsqueda.";
        campoBusqueda.focus();
        return;
    }

    // Obtenemos el criterio seleccionado para realizar la búsqueda.
    const radioSeleccionado = formularioBusqueda.querySelector('input[name="criterio"]:checked');
    const criterioBusqueda = radioSeleccionado.value;
    const urlConsulta = new URL(urlApiObras);
    urlConsulta.searchParams.set(criterioBusqueda, terminoBusqueda);

    // Ocultamos los resultados anteriores y desactivamos el botón mientras se realiza la petición.
    seccionResultados.hidden = true;
    contenedorObras.innerHTML = "";
    botonBuscar.disabled = true;

    // Creamos una promesa para solicitar la información a la API.
    const promesaObras = new Promise(function (resolver, rechazar) {
        const solicitudObras = new XMLHttpRequest();

        // Configuramos la petición para obtener los datos del servidor.
        solicitudObras.open("GET", urlConsulta.href);
        solicitudObras.setRequestHeader("ngrok-skip-browser-warning", "true");
        solicitudObras.timeout = 15000;

        // Comprobamos si el servidor respondió correctamente.
        solicitudObras.onload = function () {
            if (solicitudObras.status >= 200 && solicitudObras.status < 300) {
                try {
                    // Convertimos la respuesta del servidor a formato JSON.
                    resolver(JSON.parse(solicitudObras.responseText));
                } catch {
                    rechazar(new Error("La respuesta JSON no es válida."));
                }
            } else {
                // Informamos si el servidor devuelve un código de error.
                rechazar(new Error("Error HTTP " + solicitudObras.status));
            }
        };

        // Detectamos si ocurre algún problema durante la conexión.
        solicitudObras.onerror = function () {
            rechazar(new Error("Error de red o CORS."));
        };

        // Comprobamos si la petición supera el tiempo establecido.
        solicitudObras.ontimeout = function () {
            rechazar(new Error("La API tardó demasiado en responder."));
        };

        // Enviamos la petición al servidor.
        solicitudObras.send();
    });

    // Creamos una variable para almacenar las fichas de las obras.
    let salidaObras = "";

    try {
        // Esperamos la respuesta de la API antes de procesar los datos.
        const obrasEncontradas = await promesaObras;

        // Verificamos que la información recibida sea un arreglo.
        if (!Array.isArray(obrasEncontradas)) {
            throw new Error("La API no devolvió un arreglo de obras.");
        }

        // Comprobamos si la búsqueda obtuvo algún resultado.
        if (obrasEncontradas.length === 0) {
            avisoBusqueda.textContent = "No se encontraron obras para esa búsqueda.";
            return;
        }

        // Convertimos los caracteres especiales para mostrarlos correctamente en HTML.
        const escaparHtml = (valor) => String(valor ?? "—")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;");

        // Recorremos el arreglo para obtener la información de cada obra.
        obrasEncontradas.forEach((obra) => {
            const tituloObra = escaparHtml(obra.titulo);
            let imagenObra = "";

            // Comprobamos si la obra cuenta con una imagen.
            if (obra.imagen) {
                // Obtenemos la dirección de la imagen.
                const urlImagen = new URL(obra.imagen.replace(/^\/+/, ""), urlApiObras);

                // Verificamos que la dirección de la imagen utilice un protocolo válido.
                if (urlImagen.protocol === "https:" || urlImagen.protocol === "http:") {
                    imagenObra = `
                        <div class="col-12 col-md-6">
                            <img src="${escaparHtml(urlImagen.href)}" class="img-fluid" alt="${tituloObra}">
                        </div>`;
                }
            }

            // Definimos el espacio que ocuparán los datos dependiendo de si existe una imagen.
            const claseDatosObra = imagenObra ? "col-12 col-md-6" : "col-12";

            // Agregamos el título, descripción y características de cada obra.
            salidaObras += `
                <div class="col-12 col-md-6">
                    <article class="obra-resultado h-100">
                        <div class="row g-3">
                            ${imagenObra}
                            <div class="${claseDatosObra}">
                                <h3>${tituloObra}</h3>
                                <p>${escaparHtml(obra.descripcion)}</p>
                                <p>Artista: ${escaparHtml(obra.artista)}</p>
                                <p>Año: ${escaparHtml(obra.anio)}</p>
                                <p>Tipo: ${escaparHtml(obra.tipo)}</p>
                                <p>Movimiento: ${escaparHtml(obra.movimiento)}</p>
                            </div>
                        </div>
                    </article>
                </div>`;
        });

        // Mostramos todas las fichas generadas dentro de la página.
        contenedorObras.innerHTML = salidaObras;
        seccionResultados.hidden = false;
    } catch (error) {
        // Mostramos un mensaje cuando ocurre un problema durante la búsqueda.
        console.error(error);
        avisoBusqueda.textContent = "Error en la búsqueda.";
    } finally {
        // Habilitamos nuevamente el botón al terminar la petición.
        botonBuscar.disabled = false;
    }
}
