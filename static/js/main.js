const {
	Component,
	Record,
	Store,
} = window.Torus;

let FIRST_TIME = Infinity;
let LAST_TIME = -Infinity;
let DURATION = 1;
let HEATMAP_COUNT_VERT = 32; // a month, with some buffer
let HEATMAP_COUNT_HORIZ = 100;
let HISTOGRAM_RESOLUTION = 50;

async function fetchHistoryItems() {
	const fetchedHistItems = await fetch('/data.json').then(resp => resp.json());
	const histItems = [];
	for (let i = 0;; i ++) {
		if (i in fetchedHistItems) {
			histItems.push(fetchedHistItems[i]);

            const timestamps = Object.keys(fetchedHistItems[i].visits).map(n => +n).sort();
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
                return visitTimes.filter(time => lo < +time && +time < hi).length;
            }).map(count => jdom`<div class="histo"
                title="${count} visits"
                style="opacity:${Math.sqrt(count/24)}">
            </div>`)}
        </div>
	</div>`;
}

class Dashboard extends Component {
	init() {
		this.search = '';
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');

		this.histItems = [];
		fetchHistoryItems().then(data => {
			this.histItems = data;
			this.render();
		});
	}
    renderHeatmap() {
        requestAnimationFrame(() => {
            if (!this.histItems.length) {
                return;
            }

            const ctx = this.ctx;
            const {width, height} = this.canvas.getBoundingClientRect();
            this.canvas.width = width;
            this.canvas.height = height;
            const RESOLUTION = DURATION / (HEATMAP_COUNT_VERT * HEATMAP_COUNT_HORIZ);
            const VERT_INCREMENT = height / HEATMAP_COUNT_VERT;
            const HORIZ_INCREMENT = width / HEATMAP_COUNT_HORIZ;

            const searchedVisitTimes = this.histItems
                .map(item => Object.keys(item.visits))
                .flat()
                .map(time => +time);

            let searchedVisitCounts = new Array(HEATMAP_COUNT_VERT * HEATMAP_COUNT_HORIZ).fill(0);
            for (const time of searchedVisitTimes) {
                const diff = (time - FIRST_TIME) / DURATION * (HEATMAP_COUNT_VERT * HEATMAP_COUNT_HORIZ);
                searchedVisitCounts[Math.floor(diff)] ++;
            }
            searchedVisitCounts = searchedVisitCounts.filter(n => !isNaN(n));

            const MAX_COUNT = Math.max(...searchedVisitCounts);

            const drawCell = (x, y, count) => {
                const byte = Math.floor((MAX_COUNT - count) / MAX_COUNT * 255.99999999).toString(16).padStart(2, '0');

                ctx.fillStyle = '#' + byte + byte + byte;
                ctx.beginPath();
                ctx.rect(
                    x * HORIZ_INCREMENT,
                    y * VERT_INCREMENT,
                    (x + 1) * HORIZ_INCREMENT,
                    (y + 1) * VERT_INCREMENT,
                );
                ctx.fill();
            }

            for (let y = 0; y < HEATMAP_COUNT_VERT; y ++) {
                for (let x = 0; x < HEATMAP_COUNT_HORIZ; x ++) {
                    drawCell(x, y, searchedVisitCounts[y * HEATMAP_COUNT_VERT + x]);
                }
            }
        });
    }
	compose() {
		const loweredSearch = this.search.toLowerCase();
		const searchedItems = this.histItems.filter(item => item.url.toLowerCase().includes(loweredSearch));

        this.renderHeatmap();

		return jdom`<div class="dashboard">
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
						}}/>
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
			<header class="accent paper">Histools</header>
			${this.dashboard.node}
		</div>`;
	}
}

const app = new App();
document.getElementById('root').appendChild(app.node);
