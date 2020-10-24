const {
	Component,
	Record,
	Store,
} = window.Torus;

async function fetchHistoryItems() {
	const fetchedHistItems = await fetch('/data.json').then(resp => resp.json());
	const histItems = [];
	for (let i = 0;; i ++) {
		if (i in fetchedHistItems) {
			histItems.push(fetchedHistItems[i]);
		} else {
			break;
		}
	}
	return histItems.sort((a, b) => {
		// sort in visit_count desc
		if (a.visit_count > b.visit_count) return -1;
		if (a.visit_count < b.visit_count) return 1;
		return 0;
	});
}

function HistItem({
	url,
	visits,
	visit_count,
	domain_expansion,
}) {
	let title = '(unknown)'
	const visitTimes = Object.keys(visits);
	if (visitTimes.length) {
		title = visits[visitTimes[0]];
	}

	return jdom`<div class="visit paper">
		<div class="visit-title">${title}</div>
		<div class="visit-url"><code>${url}</code></div>
	</div>`;
}

class Dashboard extends Component {
	init() {
		this.search = '';

		this.histItems = [];
		fetchHistoryItems().then(data => {
			this.histItems = data;
			this.render();
		});
	}
	compose() {
		const loweredSearch = this.search.toLowerCase();
		const searchedItems = this.histItems.filter(item => item.url.toLowerCase().includes(loweredSearch));

		return jdom`<div class="dashboard">
			<div class="heatmap">
			</div>
			<div class="sidebar">
				<div class="searchbar">
					<input type="text"
						class="paper"
						value=${this.search}
						oninput=${evt => {
							this.search = evt.target.value;
							this.render();
						}}/>
				</div>
				<div class="visits">
					${searchedItems.slice(0, 500).map(HistItem)}
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
			<h2 class="accent paper">Histools</h2>
			${this.dashboard.node}
		</div>`;
	}
}

const app = new App();
document.getElementById('root').appendChild(app.node);
