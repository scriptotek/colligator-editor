(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// ---------------------------------------------------------------------------
// EditableCover.vue

const EditableCover = {
  template: `
    <div>
      <div v-if="!editMode" >
        Omslagsbilde:
        <span v-if="doc.cover">
          <a :href="doc.cover.url" target="_blank">{{ doc.cover.url.length > 80 ? doc.cover.url.substr(0,80) + '…' : doc.cover.url }}</span></a>
        <span v-else>(mangler)</span>
        <button v-on:click="edit" class="btn btn-default btn-xs">Rediger</button>
      </div>
      <form v-else v-on:submit.prevent="submit" class="form-inline">
        <div class="form-group">
          <label :for="'coverUrl' + doc.id">Cover:</label>
          <input type="text" :id="'coverUrl' + doc.id" class="form-control input-sm" style="width:600px" v-model="url">
        </div>
        <span v-if="busy">
          Hold on…
        </span>
        <span v-else>
          <button type="button" class="btn btn-default btn-sm" v-on:click="cancel">Avbryt</button>
          <button type="submit" class="btn btn-primary btn-sm">Lagre</button>
        </span>
        <div class="alert alert-danger" role="alert" v-if="errors.length">
          <div v-for="error in errors">{{ error }}</div>
        </div>
      </form>
    </div>
  `,
  props: {
    doc: Object
  },
  data: () => ({
    url: '',
    busy: false,
    errors: [],
    editMode: false
  }),
  created: function () {
    this.url = this.doc.cover ? this.doc.cover.url : ''
  },
  methods: {
    edit: function () {
      this.editMode = true

      // Allow Vue to update the DOM before we focus
      setTimeout(() => document.getElementById('coverUrl' + this.doc.id).focus())
    },
    cancel: function () {
      this.editMode = false
      this.url = this.doc.cover ? this.doc.cover.url : ''
    },
    submit: function () {
      let documents = this.$resource('https://colligator.biblionaut.net/api/documents{/id}', {}, {
        saveCover: {method: 'POST', url: 'https://colligator.biblionaut.net/api/documents{/id}/cover'}
      })
      if (this.busy) {
        return
      }
      this.busy = true
      this.error = ''
      documents.saveCover({id: this.doc.id}, {url: this.url}).then((response) => {
        this.busy = false
        if (response.body.result !== 'ok') {
          this.errors = [response.body.error]
          return
        }
        this.doc.cover = response.body.cover
        this.editMode = false
      }, (response) => {
        // error callback
        this.errors = ['Save failed because of network or server issues.']
        console.log(response)
        if (response.status === 422) {
          this.errors = Object.keys(response.body).map(k => response.body[k][0])
          console.log(this.errors)
        }
        this.busy = false
      })
    }
  }
}

// ---------------------------------------------------------------------------
// Document.vue
// import EditableCover from 'EditableCover.vue'

const Document = {
  template: `
    <li class="list-group-item">
      <div>
        <img v-if="doc.cover" :src="doc.cover.thumb.url" style="width: 100px;" />
        <div>
          <h3>{{ doc.title }}</h3>
          ISBN: <span v-for="isbn in doc.isbns"> {{ isbn }} </span>
          <div v-for="holding in localHoldings">
            {{ holding.barcode }} :
            {{ holding.callcode }}
          </div>
          <editable-cover :doc="doc"></editable-cover>
        </div>
      </div>
    </li>
  `,
  props: {
    doc: Object
  },
  computed: {
    localHoldings: function () {
      return this.doc.holdings.filter(holding => holding.shelvinglocation === 'k00475')
    }
  },
  components: {
    'editable-cover': EditableCover
  }
}

// ---------------------------------------------------------------------------
// Search.vue

const Search = {
  template: `
    <div>
      <form v-on:submit.prevent="submitForm" class="form-inline">
        Search using <a target="_blank" href="https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-query-string-query.html">ElasticSearch query string syntax</a>:
        <input v-model="query" class="form-control" style="width:500px">
        <button type="submit" class="btn btn-primary">Search</button>
        <p>
          Du kan jo f.eks. søke etter <code>collections:bio1000 AND _missing_:cover</code>
        </p>
      </form>
      <router-view></router-view>
    </div>
  `,
  created: function () {
    console.log('Hello, Search created')
    this.getQueryString()
  },
  watch: {
    // call again the method if the route changes
    '$route': 'getQueryString'
  },
  data: () => ({
    query: ''
  }),
  methods: {
    submitForm: function () {
      this.$router.push({ path: '/search', query: { q: this.query } })
    },
    getQueryString: function () {
      this.query = this.$route.query.q
    }
  }
}

// ---------------------------------------------------------------------------
// SearchResults.vue
// import Document from 'Document.vue'

const SearchResults = {
  template: `
    <div>
      <div v-show="busy">Hold on…</div>
      <div v-show="!busy">Got {{ documents.length }} of {{ totalResults }} results</div>
      <ul class="list-group">
        <document :doc="doc" v-for="doc in documents"></document>
      </ul>
    </div>
  `,
  created: function () {
    console.log('Hello, SearchResults created')
    this.fetchResults()
  },
  watch: {
    // call again the method if the route changes
    '$route': 'fetchResults'
  },
  components: {
    'document': Document
  },
  data: function () {
    return {
      documents: [],
      totalResults: 0,
      busy: true
    }
  },
  methods: {
    fetchResults: function () {
      this.documents = []
      this.busy = true
      console.log('Searching for: ' + this.$route.query.q)
      let documents = this.$resource('https://colligator.biblionaut.net/api/documents{/id}')

      documents.get({q: this.$route.query.q}).then((response) => {
        this.documents = response.body.documents
        this.totalResults = response.body.total
        this.busy = false
      }, (response) => {
        // error callback
        console.log(response)
        this.busy = false
      })
    }
  }
}

// ---------------------------------------------------------------------------

// main.js
// import Vue from 'vue'
// import VueRouter from 'vue-router'
// import Search from 'Search.vue'
// import SearchResults from 'SearchResults.vue'

const router = new VueRouter({
  routes: [
    {
      path: '/',
      component: Search,
      children: [
        {
          path: 'search',
          component: SearchResults
        }
      ]
    }
  ]
})

// mount a root Vue instance
new Vue({router}).$mount('#app')

},{}]},{},[1]);
