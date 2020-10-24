` export sqlite3 database to JSON format `

std := load('vendor/std')
str := load('vendor/str')
serializeJSON := load('vendor/json').ser

log := std.log
f := std.format
slice := std.slice
each := std.each
map := std.map
filter := std.filter
reduce := std.reduce
writeFile := std.writeFile

split := str.split
trim := str.trim
index := str.index

Newline := char(10)

SQLiteBinary := 'sqlite3'
DBPath := args().2

parse := lineOutput => (
	splitPair := pairLine => (
		splitIdx := index(pairLine, ' = ')
		[
			slice(pairLine, 0, splitIdx)
			slice(pairLine, splitIdx + 3, len(pairLine))
		]
	)

	lines := map(split(lineOutput, Newline), line => trim(line, ' '))
	rows := reduce(lines, (acc, line) => line :: {
		'' -> (
			acc.len(acc) := {}
		)
		_ -> (
			target := acc.(len(acc) - 1)
			pair := splitPair(line)
			target.(pair.0) := pair.1
			acc
		)
	}, [{}])
	nonEmptyRows := filter(rows, row => len(row) > 0)
)

withHistoryItems := cb => (
	exec(
		SQLiteBinary
		['-line', DBPath, 'select id, url, domain_expansion, visit_count from history_items;']
		''
		evt => evt.type :: {
			'data' -> cb(parse(evt.data))
			_ -> log('sqlite3 error: ' + string(evt))
		}
	)
)

withHistoryVisits := cb => (
	exec(
		SQLiteBinary
		['-line', DBPath, 'select history_item, visit_time, title from history_visits;']
		''
		evt => evt.type :: {
			'data' -> cb(parse(evt.data))
			_ -> log('sqlite3 error: ' + string(evt))
		}
	)
)

find := (list, pred) => (sub := i => (
	i :: {
		len(list) -> ()
		_ -> pred(list.(i)) :: {
			true -> list.(i)
			false -> sub(i + 1)
		}
	}
))(0)

` main: parse, save JSON to static/data.json `
withHistoryItems(items => (
	withHistoryVisits(visits => (
		log(f('{{ 0 }} history entries, {{ 1 }} total visits. analyzing...'
			[len(items), len(visits)]))

		each(visits, visit => (
			visitItem := find(items, item => item.id = visit.('history_item'))
			visitItem :: {
				() -> ()
				_ -> (
					visit.url := visitItem.url
					visit.('domain_expansion') := visitItem.('domain_expansion')
					visit.('visit_count') := visitItem.('visit_count')
				)
			}
		))

		log('writing database...')

		writeFile('static/data.json', serializeJSON(visits), result => result :: {
			true -> log('write success.')
			_ -> log('write file.')
		})
	))
))
