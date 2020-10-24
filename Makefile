all: serve

serve:
	ink vendor/fileserver.ink

# run export, "run" b/c export is a Makefile keyword
run:
	ink export.ink History.db

fmt:
	inkfmt fix *.ink
f: fmt

fmt-check:
	inkfmt *.ink
fk: fmt-check
