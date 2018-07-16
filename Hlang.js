/**
  @author Oyedele Hammed
  @description A Simple and Lispy Toy Scripting language in JavaScript!
  @version 0.1
  @see https://github.com/devHammed/Hlang
  @since July 16, 2018
*/

( function( root ) {

  var tokenize = function tokenize( input ) {
    var escapeMap = {
      '%n': '\n',
      '%t': '\t',
      '%bs': '\\',
      '%q': '\"',
      '%r': '\r',
      '%fs': '/',
      '%c': ':',
    };
    return input.split( '"' )
      .map( function( str, i ) {
        if ( i % 2 === 0 ) {
          return str.replace( /\{/g, ' { ' ).replace( /\}/g, ' } ' ).replace( /:/g, ' ' );
        } else { // in string
          return str.replace( / /g, '_sp_' );
        }
      } )
      .join( '"' )
      .trim()
      .split( /\s+/ )
      .map( function( str ) {
        return str
          .replace( /_sp_/g, ' ' )
          .replace( /(%\w){1,2}/g, function( str ) { return escapeMap[ str ]; } );
      } );
  };

  var parse = function parse( tokens ) {
    var op = tokens.shift();
    if ( op === '{' ) {
      var exp = [];
      while ( tokens[0] !== '}' ) {
        exp.push( parse( tokens ) );
      }
      tokens.shift();
      return { type: 'block', value: exp };
    } else if ( !isNaN( parseFloat( op ) ) ) {
      return { type: 'literal', value: parseFloat( op ) };
    } else if ( op[0] === '"' && op.slice(-1) === '"' ) {
      return { type: 'literal', value: op.slice( 1, -1 ) };
    } else {
      return { type: 'variable', value: op };
    }
  };

  var evaluate = function evaluate( ast, env ) {
    switch ( ast.type ) {
      case 'literal':
        return ast.value;
      case 'variable':
        if ( ast.value in env ) {
          return env[ ast.value ];
        } else {
          throw 'ReferenceError: ' + ast.value + ' is not defined!';
        }
      case 'block':
        var block = ast.value,
          fn = block[0],
          args = block.slice(1);
        if ( fn.value in stdLib ) {
          return stdLib[ fn.value ]( args, env, evaluate );
        }
        fn = evaluate( fn, env );
        if ( typeof fn !== 'function' ) {
          throw 'TypeError: ' + fn + ' is not function!';
        }
        return fn.apply( null, args.map( function( arg ) {
          return evaluate( arg, env );
        } ) );
    }
  }; // End of Interpreter

  var stdLib = {
    'do': function( args, env , interp ) {
      var ret = '';
      args.forEach( function( arg ) {
        ret = interp( arg, env );
      } );
      return ret;
    },
    'if': function( args, env, interp ) {
      if ( args.length < 2 ) {
        throw 'SyntaxError: If expects at-least the `then` part!';
      }
      return ( interp( args[0], env ) != false ) ? interp( args[1], env ) : interp( args[2] || false, env );
    },
    'while': function( args, env, interp ) {
      if ( args.length < 2 ) {
        throw 'SyntaxError: While expects the condition and body!';
      }
      while ( interp( args[0], env ) !== false ) {
        interp( args[1], env );
      }
      return true;
    },
    'fn': function( args, env, interp ) {
      if ( !args.length ) {
        throw 'SyntaxError: Function needs arguments and body!';
      }
      var argNames = args[0].value.map( function( arg ) {
        if ( arg.type !== 'variable' ) {
          throw 'TypeError: ' + arg.value + ' is not a valid variable name!';
        }
        return arg.value;
      } );
      var body = args[1];
      return function() {
        var localEnv = Object.create( env );
        for ( var i = 0, len = argNames.length; i < len; i++ ) {
          localEnv[ argNames[ i ] ] = arguments[ i ] || undefined;
        }
        localEnv[ '__args' ] = [].slice.call( arguments );
        return interp( body, localEnv );
      };
    },
  };

  stdLib[ 'def' ] = stdLib[ '=' ] = function( args, env, interp ) {
    env[ args[0].value ] = interp( args[1], env );
  };

  var stdEnv = {
    'true': true,
    'false': false,
    'null': null,
    'undefined': undefined,
    'puts': function puts() {
      console.log( [].join.call( arguments, ' ' ) );
    },
    'list': function list() {
      return [].slice.call( arguments );
    },
    'hash': function hash() {
      var args = [].slice.call( arguments ),
        hash = {},
        i = 0,
        len = args.length;
      while ( i < len ) {
        hash[ args[ i ] ] = args[ ++i ];
        i++;
      }
      return hash;
    },
    'item': function item( arr, i ) {
      return arr[ i ] || false;
    }
  };

  ['+', '-', '*', '/', '==', '>', '<', '>=', '<=', '|', '&', '||', '&&'].map( function( op ) {
    stdEnv[ op ] = new Function( 'a, b', 'return a' + op + 'b;');
  } );

  Object.getOwnPropertyNames( Array.prototype ).slice(2).map( function( fn ) {
    stdEnv[ fn ] = new Function( '', 'return [].' + fn + '.apply( arguments[0], [].slice.call( arguments, 1 ) );' );
  } ); // Add JavaScript Array functions (laziness!)

  root.Hlang = function Hlang() {
    var code = [].slice.call( arguments ).join('\n');
    try {
      return evaluate( parse( tokenize( code ) ), stdEnv );
    } catch ( e ) {
      console.error( e );
    }
  };

} )( typeof exports !== 'undefined' ? exports : this );
