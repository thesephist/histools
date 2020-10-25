const {
    Component,
    Record,
    Store,
} = window.Torus;

let FIRST_TIME = Infinity;
let LAST_TIME = -Infinity;
let DURATION = 1;

let HISTOGRAM_RESOLUTION = 32; // a month, with some buffer
let HEATMAP_COUNT_VERT = 32; // a month, with some buffer, so each row = 1 day
let HEATMAP_COUNT_HORIZ = 100;

// Apple's timestamps count time from midnight Jan 1 2000
// whereas JavaScript needs it in a JS / UNIX timestamp since 1970.
// This diff counts the number seconds between those to zeroes.
const APPLE_UNIX_ZERO_TIME_OFFSET = 946684800;

// Fetch a JSON output from the Ink export script and pre-process it
// to be displayed by the Dashboard component.
async function fetchHistoryItems() {
    const fetchedHistItems = await fetch('/data.json').then(resp => resp.json());
    const histItems = [];
    for (let i = 0; ; i ++) {
        if (i in fetchedHistItems) {
            histItems.push(fetchedHistItems[i]);

            const timestamps = Object.keys(fetchedHistItems[i].visits).map(n => parseFloat(n)).sort();
            if (FIRST_TIME > timestamps[0]) {
                FIRST_TIME = timestamps[0];
            }
            if (LAST_TIME < timestamps[timestamps.length - 1]) {
                LAST_TIME = timestamps[timestamps.length - 1];
            }
        } else {
            break;
        }
    }
    for (const item of histItems) {
        item.visit_count = +item.visit_count;
    }
    histItems.sort((a, b) => {
        // sort in visit_count desc
        if (a.visit_count > b.visit_count) return -1;
        if (a.visit_count < b.visit_count) return 1;
        return 0;
    });
    FIRST_TIME = Math.floor(FIRST_TIME / 86400) * 86400;
    LAST_TIME = (Math.floor(LAST_TIME / 86400) + 1) * 86400;
    DURATION = LAST_TIME - FIRST_TIME;
    return histItems;
}

function HistItem({
    url,
    visits,
    visit_count,
}) {
    let title = '(unknown)'
    const visitTimes = Object.keys(visits);
    if (visitTimes.length) {
        title = visits[visitTimes[0]];
    }

    return jdom`<div class="visit paper">
        <div class="visit-count">${visit_count}</div>
        <div class="visit-title">${title || '(unknown)'}</div>
        <div class="visit-url">
            <a href=${url} target="_blank">
                <code>${url}</code>
            </a>
        </div>
        <div class="visit-histogram">
            ${new Array(HISTOGRAM_RESOLUTION).fill(0).map((_, day) => {
                const lo = day * (DURATION / HISTOGRAM_RESOLUTION) + FIRST_TIME;
                const hi = (day + 1) * (DURATION / HISTOGRAM_RESOLUTION) + FIRST_TIME;
                let count = 0;
                for (let i = 0, len = visitTimes.length; i < len; i ++) {
                    const t = parseFloat(visitTimes[i]);
                    if (lo < t && t < hi) count++;
                }
                return count;
            }).map(count => {
                // This is a critical path, so we bypass the template parser
                return {
                    tag: 'div',
                    attrs: {
                        class: 'histo',
                        title: `${count} visits`,
                        style: {
                            opacity: Math.sqrt(count/24),
                        },
                    },
                }
            })}
        </div>
    </div>`;
}

class DateTimeCountDisplay extends Component {
    init() {
        this.datetime = new Date();
        this.count = 0;
        this.x = 0;
        this.y = 0;
    }
    setDateTimeCount(datetime, count) {
        this.datetime = datetime;
        this.count = count;
        this.render();
    }
    setPosition(x, y) {
        this.x = x;
        this.y = y;
    }
    compose() {
        const d = this.datetime;
        return jdom`<div class="datetimecount"
            style="transform:translate(${this.x}px, calc(${this.y}px - 100%))">
            <div class="dtc-datetime">
                ${d.getFullYear()}/${d.getMonth()}/${d.getDate()}
                ${d.getHours()}:${d.getMinutes()}
            </div>
            <div class="dtc-visits">${this.count} visits</div>
        </div>`
    }
}

class Dashboard extends Component {
    init() {
        this.search = '';
        this.canvas = document.createElement('canvas');
        this.canvas.addEventListener('mouseout', evt => {
            this.node.classList.remove('hover');
        });
        this.canvas.addEventListener('mousemove', evt => {
            const {clientX, clientY} = evt.pointers ? evt.pointers[0] : evt;
            const {x, y} = this.canvas.getBoundingClientRect();
            const boundX = clientX - x;
            const boundY = clientY - y;

            const xIndex = Math.floor(boundX / this.HORIZ_INCREMENT);
            const yIndex = Math.floor(boundY / this.VERT_INCREMENT);
            const index = yIndex * HEATMAP_COUNT_HORIZ + xIndex;

            const dateFromDarwinZero = FIRST_TIME + index * (DURATION / HEATMAP_COUNT_VERT / HEATMAP_COUNT_HORIZ);
            const unixDate = dateFromDarwinZero + APPLE_UNIX_ZERO_TIME_OFFSET;
            const jsDate = unixDate * 1000;

            requestAnimationFrame(() => {
                this.node.classList.add('hover');
                this.dtc.setDateTimeCount(
                    new Date(jsDate),
                    this.searchedVisitCounts[index],
                );
                this.dtc.setPosition(clientX, clientY);
            });
        });
        this.ctx = this.canvas.getContext('2d');

        this.searchedVisitCounts = [0];
        this.VERT_INCREMENT = Infinity;
        this.HORIZ_INCREMENT = Infinity;

        this.histItems = [];
        fetchHistoryItems().then(data => {
            this.histItems = data;
            this.render();
        });

        this.dtc = new DateTimeCountDisplay();
    }
    renderHeatmap(searchedItems) {
        requestAnimationFrame(() => {
            if (!this.histItems.length) {
                return;
            }

            const ctx = this.ctx;
            const {width, height} = this.canvas.getBoundingClientRect();
            this.canvas.width = width;
            this.canvas.height = height;
            const RESOLUTION = DURATION / (HEATMAP_COUNT_VERT * HEATMAP_COUNT_HORIZ);

            this.VERT_INCREMENT = height / HEATMAP_COUNT_VERT;
            this.HORIZ_INCREMENT = width / HEATMAP_COUNT_HORIZ;
            const VERT_INCREMENT = this.VERT_INCREMENT;
            const HORIZ_INCREMENT = this.HORIZ_INCREMENT;

            const searchedVisitTimes = [];
            for (const item of searchedItems) {
                for (const timestamp in item.visits) {
                    searchedVisitTimes.push(+timestamp);
                }
            }

            let searchedVisitCounts = new Array(HEATMAP_COUNT_VERT * HEATMAP_COUNT_HORIZ).fill(0);
            for (const time of searchedVisitTimes) {
                const diff = (time - FIRST_TIME) / DURATION * (HEATMAP_COUNT_VERT * HEATMAP_COUNT_HORIZ);
                searchedVisitCounts[Math.floor(diff)] ++;
            }
            this.searchedVisitCounts = searchedVisitCounts.filter(n => !isNaN(n));

            const MAX_COUNT = Math.max(...this.searchedVisitCounts);

            const drawCell = (x, y, count) => {
                const opacity = Math.sqrt(count / MAX_COUNT);
                ctx.fillStyle = `rgba(64, 89, 140, ${opacity})`;
                ctx.fillRect(
                    x * HORIZ_INCREMENT,
                    y * VERT_INCREMENT,
                    HORIZ_INCREMENT,
                    VERT_INCREMENT,
                );
            }

            ctx.clearRect(0, 0, width, height);
            for (let y = 0; y < HEATMAP_COUNT_VERT; y ++) {
                for (let x = 0; x < HEATMAP_COUNT_HORIZ; x ++) {
                    drawCell(x, y, this.searchedVisitCounts[y * HEATMAP_COUNT_HORIZ + x]);
                }
            }
        });
    }
    compose() {
        const loweredSearch = this.search.toLowerCase();
        const searchedItems = this.histItems.filter(item => item.url.toLowerCase().includes(loweredSearch));

        this.renderHeatmap(searchedItems);

        return jdom`<div class="dashboard">
            ${this.dtc.node}
            <div class="heatmap">
                ${this.canvas}
            </div>
            <div class="sidebar">
                <div class="searchbar">
                    <input type="text"
                        class="paper"
                        placeholder="Search urls..."
                        value=${this.search}
                        autofocus
                        oninput=${evt => {
                            this.search = evt.target.value;
                            this.render();
                        }} />
                </div>
                <div class="visits">
                    ${searchedItems.slice(0, 100).map(HistItem)}
                </div>
            </div>
        </div>`;
    }
}

class App extends Component {
    init() {
        this.dashboard = new Dashboard();
    }
    compose() {
        return jdom`<div class="app">
            <header class="accent paper">
                <div class="left"><strong>Histools</strong></div>
                <div class="right">
                    <a href="https://github.com/thesephist/histools" target="_blank">about</a>
                </div>
            </header>
            ${this.dashboard.node}
        </div>`;
    }
}

const app = new App();
document.getElementById('root').appendChild(app.node);
